import { NextRequest, NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma, Currency } from "../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

function handleError(error: unknown) {
  console.error(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 400 }
    );
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

type CreatePaymentInput = {
  billId?: string;
  customerId?: string;
  amountPaid: number | string;
  currency: "AFN" | "USD";
  paymentNumber?: string;
  paymentMethod?: string;
  note?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as CreatePaymentInput | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      billId,
      customerId,
      amountPaid,
      currency,
      paymentNumber,
      paymentMethod,
      note,
    } = body;

    const parsedAmount = Number(amountPaid);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    if (currency !== "AFN" && currency !== "USD") {
      return NextResponse.json(
        { error: "Currency must be AFN or USD" },
        { status: 400 }
      );
    }

    if (paymentNumber != null && typeof paymentNumber !== "string") {
      return NextResponse.json(
        { error: "Payment number must be a string" },
        { status: 400 }
      );
    }

    const normalizedPaymentNumber =
      typeof paymentNumber === "string" ? paymentNumber.trim() : "";
    if (!normalizedPaymentNumber) {
      return NextResponse.json(
        { error: "Payment number is required" },
        { status: 400 }
      );
    }
    if (!/^[0-9]+$/.test(normalizedPaymentNumber)) {
      return NextResponse.json(
        { error: "Payment number must be digits only" },
        { status: 400 }
      );
    }

    const normalizedBillId = typeof billId === "string" ? billId : null;
    const normalizedCustomerId =
      typeof customerId === "string" ? customerId : null;

    if (!normalizedBillId && !normalizedCustomerId) {
      return NextResponse.json(
        { error: "Customer id is required when bill id is not provided" },
        { status: 400 }
      );
    }

    if (normalizedBillId) {
      const bill = await prisma.bill.findUnique({
        where: { id: normalizedBillId },
        select: {
          id: true,
          customerId: true,
          items: {
            select: {
              currency: true,
              totalAmount: true,
            },
          },
          payments: {
            select: {
              currency: true,
              amountPaid: true,
            },
          },
        },
      });

      if (!bill) {
        return NextResponse.json({ error: "Bill not found" }, { status: 404 });
      }

      if (normalizedCustomerId && bill.customerId !== normalizedCustomerId) {
        return NextResponse.json(
          { error: "Bill does not belong to customer" },
          { status: 400 }
        );
      }

      let billTotal = 0;
      let billPaid = 0;
      for (const item of bill.items) {
        if (item.currency === currency) {
          billTotal += Number(item.totalAmount.toString());
        }
      }
      for (const payment of bill.payments) {
        if (payment.currency === currency) {
          billPaid += Number(payment.amountPaid.toString());
        }
      }

      const billRemaining = Math.max(billTotal - billPaid, 0);
      if (parsedAmount > billRemaining) {
        return NextResponse.json(
          { error: "Payment exceeds outstanding balance" },
          { status: 400 }
        );
      }

      const created = await prisma.payment.create({
        data: {
          billId: bill.id,
          paymentNumber: normalizedPaymentNumber,
          amountPaid: new Prisma.Decimal(parsedAmount),
          currency,
          paymentMethod: paymentMethod?.trim() || "Manual",
          note: typeof note === "string" ? note : null,
        },
      });

      return NextResponse.json({ payments: [created] }, { status: 201 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: normalizedCustomerId! },
      select: {
        id: true,
        initialDebtAFN: true,
        initialDebtUSD: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const bills = await prisma.bill.findMany({
      where: { customerId: normalizedCustomerId! },
      orderBy: { billDate: "asc" },
      include: {
        items: {
          select: {
            currency: true,
            totalAmount: true,
          },
        },
        payments: {
          select: {
            currency: true,
            amountPaid: true,
          },
        },
      },
    });

    const INITIAL_DEBT_NOTE = "Initial debt adjustment";
    let initialPaid = 0;
    const billRemaining: { billId: string; remaining: number }[] = [];

    for (const bill of bills) {
      if (bill.note === INITIAL_DEBT_NOTE) {
        for (const payment of bill.payments) {
          if (payment.currency === currency) {
            initialPaid += Number(payment.amountPaid.toString());
          }
        }
        continue;
      }

      let total = 0;
      let paid = 0;
      for (const item of bill.items) {
        if (item.currency === currency) {
          total += Number(item.totalAmount.toString());
        }
      }
      for (const payment of bill.payments) {
        if (payment.currency === currency) {
          paid += Number(payment.amountPaid.toString());
        }
      }

      const remaining = Math.max(total - paid, 0);
      if (remaining > 0) {
        billRemaining.push({ billId: bill.id, remaining });
      }
    }

    const billRemainingTotal = billRemaining.reduce(
      (sum, entry) => sum + entry.remaining,
      0
    );

    const initialDebt =
      currency === "AFN"
        ? Number(customer.initialDebtAFN ?? 0)
        : Number(customer.initialDebtUSD ?? 0);
    const initialRemaining = Number.isFinite(initialDebt)
      ? Math.max(initialDebt - initialPaid, 0)
      : 0;

    const totalRemaining = billRemainingTotal + initialRemaining;

    if (totalRemaining <= 0) {
      return NextResponse.json(
        { error: "No outstanding balance for this currency" },
        { status: 400 }
      );
    }

    if (parsedAmount > totalRemaining) {
      return NextResponse.json(
        { error: "Payment exceeds outstanding balance" },
        { status: 400 }
      );
    }

    let amountLeft = parsedAmount;
    const createInputs: Prisma.PaymentCreateManyInput[] = [];

    for (const entry of billRemaining) {
      if (amountLeft <= 0) break;
      const applied = Math.min(entry.remaining, amountLeft);
      amountLeft -= applied;
      createInputs.push({
        billId: entry.billId,
        paymentNumber: normalizedPaymentNumber,
        amountPaid: new Prisma.Decimal(applied),
        currency: currency as Currency,
        paymentMethod: paymentMethod?.trim() || "Manual",
        note: typeof note === "string" ? note : null,
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      const paymentsCreated: unknown[] = [];

      for (const data of createInputs) {
        const payment = await tx.payment.create({ data });
        paymentsCreated.push(payment);
      }

      if (amountLeft > 0) {
        const adjustmentBill = await tx.bill.create({
          data: {
            customerId: customer.id,
            status: "PARTIAL",
            sherkatStock: true,
            billDate: new Date(),
            note: "Initial debt adjustment",
          },
        });

        const adjustmentPayment = await tx.payment.create({
          data: {
            billId: adjustmentBill.id,
            paymentNumber: normalizedPaymentNumber,
            amountPaid: new Prisma.Decimal(amountLeft),
            currency: currency as Currency,
            paymentMethod: paymentMethod?.trim() || "Manual",
            note: typeof note === "string" ? note : null,
          },
        });

        paymentsCreated.push(adjustmentPayment);
      }

      return paymentsCreated;
    });

    return NextResponse.json({ payments: created }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json({ payments }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
