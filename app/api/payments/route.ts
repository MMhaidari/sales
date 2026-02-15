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
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Payment number already exists" },
        { status: 409 }
      );
    }
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

    const existingPayment = await prisma.payment.findFirst({
      where: { paymentNumber: normalizedPaymentNumber },
      select: { id: true },
    });
    if (existingPayment) {
      return NextResponse.json(
        { error: "Payment number already exists" },
        { status: 409 }
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
          paidAFN: true,
          paidUSD: true,
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
      let paidAFN = Number(bill.paidAFN.toString());
      let paidUSD = Number(bill.paidUSD.toString());
      for (const item of bill.items) {
        if (item.currency === currency) {
          billTotal += Number(item.totalAmount.toString());
        }
      }
      for (const payment of bill.payments) {
        const amount = Number(payment.amountPaid.toString());
        if (payment.currency === "AFN") paidAFN += amount;
        if (payment.currency === "USD") paidUSD += amount;
      }

      const billPaid = currency === "USD" ? paidUSD : paidAFN;

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
    let total = 0;
    let paid = 0;
    let initialPaid = 0;

    for (const bill of bills) {
      const billPaid =
        currency === "AFN"
          ? Number(bill.paidAFN.toString())
          : Number(bill.paidUSD.toString());

      if (bill.note === INITIAL_DEBT_NOTE) {
        initialPaid += billPaid;
        for (const payment of bill.payments) {
          if (payment.currency === currency) {
            initialPaid += Number(payment.amountPaid.toString());
          }
        }
        continue;
      }

      for (const item of bill.items) {
        if (item.currency === currency) {
          total += Number(item.totalAmount.toString());
        }
      }

      paid += billPaid;
      for (const payment of bill.payments) {
        if (payment.currency === currency) {
          paid += Number(payment.amountPaid.toString());
        }
      }
    }

    const initialDebt =
      currency === "AFN"
        ? Number(customer.initialDebtAFN ?? 0)
        : Number(customer.initialDebtUSD ?? 0);
    const initialRemaining = Number.isFinite(initialDebt)
      ? Math.max(initialDebt - initialPaid, 0)
      : 0;

    const totalRemaining = Math.max(total - paid, 0) + initialRemaining;

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

    const created = await prisma.$transaction(async (tx) => {
      const adjustmentBill = await tx.bill.create({
        data: {
          customerId: customer.id,
          status: "PAID",
          sherkatStock: false,
          billDate: new Date(),
          note: "Customer payment adjustment",
        },
      });

      const payment = await tx.payment.create({
        data: {
          billId: adjustmentBill.id,
          paymentNumber: normalizedPaymentNumber,
          amountPaid: new Prisma.Decimal(parsedAmount),
          currency: currency as Currency,
          paymentMethod: paymentMethod?.trim() || "Manual",
          note: typeof note === "string" ? note : null,
        },
      });

      return [payment];
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
