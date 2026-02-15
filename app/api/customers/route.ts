import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      name,
      phoneNumber,
      address,
      note,
      initialDebtAFN,
      initialDebtUSD,
    } = body;

    // Basic validation
    if (!name || !phoneNumber) {
      return NextResponse.json(
        { error: "name and phoneNumber are required" },
        { status: 400 }
      );
    }

    const parseNonNegative = (value: unknown) => {
      if (value == null || value === "") return 0;
      const parsed = typeof value === "string" ? Number(value) : Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) return null;
      return parsed;
    };

    const normalizedInitialAFN = parseNonNegative(initialDebtAFN);
    const normalizedInitialUSD = parseNonNegative(initialDebtUSD);

    if (normalizedInitialAFN == null || normalizedInitialUSD == null) {
      return NextResponse.json(
        { error: "Initial debts must be non-negative numbers" },
        { status: 400 }
      );
    }

    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });
    const nextOrderIndex = (lastCustomer?.orderIndex ?? -1) + 1;

    const customer = await prisma.customer.create({
      data: {
        name,
        phoneNumber,
        address,
        note,
        initialDebtAFN: normalizedInitialAFN,
        initialDebtUSD: normalizedInitialUSD,
        orderIndex: nextOrderIndex,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Customer name must be unique" },
          { status: 409 }
        );
      }
    }
    console.error("Create customer error:", error);

    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    });

    const bills = await prisma.bill.findMany({
      select: {
        customerId: true,
        note: true,
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

    const totalsByCustomer = new Map<
      string,
      {
        totalAFN: number;
        totalUSD: number;
        paidAFN: number;
        paidUSD: number;
        initialPaidAFN: number;
        initialPaidUSD: number;
      }
    >();

    const getTotals = (customerId: string) => {
      const existing = totalsByCustomer.get(customerId);
      if (existing) return existing;
      const fresh = {
        totalAFN: 0,
        totalUSD: 0,
        paidAFN: 0,
        paidUSD: 0,
        initialPaidAFN: 0,
        initialPaidUSD: 0,
      };
      totalsByCustomer.set(customerId, fresh);
      return fresh;
    };

    for (const bill of bills) {
      if (!bill.customerId) continue;
      const totals = getTotals(bill.customerId);
      const paidAFN = Number(bill.paidAFN.toString());
      const paidUSD = Number(bill.paidUSD.toString());
      if (bill.note === "Initial debt adjustment") {
        totals.initialPaidAFN += paidAFN;
        totals.initialPaidUSD += paidUSD;
        for (const payment of bill.payments) {
          const amount = Number(payment.amountPaid.toString());
          if (payment.currency === "AFN") {
            totals.initialPaidAFN += amount;
          } else if (payment.currency === "USD") {
            totals.initialPaidUSD += amount;
          }
        }
        continue;
      }
      for (const item of bill.items) {
        const amount = Number(item.totalAmount.toString());
        if (item.currency === "AFN") {
          totals.totalAFN += amount;
        } else if (item.currency === "USD") {
          totals.totalUSD += amount;
        }
      }
      totals.paidAFN += paidAFN;
      totals.paidUSD += paidUSD;
      for (const payment of bill.payments) {
        const amount = Number(payment.amountPaid.toString());
        if (payment.currency === "AFN") {
          totals.paidAFN += amount;
        } else if (payment.currency === "USD") {
          totals.paidUSD += amount;
        }
      }
    }

    const parseDecimal = (value: unknown) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const payload = customers.map((customer) => {
      const totals = getTotals(customer.id);
      const initialAFN = parseDecimal((customer as { initialDebtAFN?: unknown }).initialDebtAFN);
      const initialUSD = parseDecimal((customer as { initialDebtUSD?: unknown }).initialDebtUSD);
      const remainingInitialAFN = Math.max(initialAFN - totals.initialPaidAFN, 0);
      const remainingInitialUSD = Math.max(initialUSD - totals.initialPaidUSD, 0);
      const debtAFN = totals.totalAFN - totals.paidAFN + remainingInitialAFN;
      const debtUSD = totals.totalUSD - totals.paidUSD + remainingInitialUSD;
      return {
        ...customer,
        initialDebtAFN: initialAFN.toString(),
        initialDebtUSD: initialUSD.toString(),
        debtAFN: debtAFN.toString(),
        debtUSD: debtUSD.toString(),
        paidAFN: totals.paidAFN.toString(),
        paidUSD: totals.paidUSD.toString(),
      };
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Fetch customers error:", error);

    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
