import { NextRequest, NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../../generated/prisma/client";

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

function parsePositiveInt(value: string | null, fallback: number, max = 100) {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 10);
    const search = searchParams.get("search")?.trim();
    const skip = (page - 1) * pageSize;

    const where = search
      ? {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : undefined;

    const total = await prisma.customer.count({ where });
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      where,
      skip,
      take: pageSize,
    });

    const ids = customers.map((customer) => customer.id);
    const bills = ids.length
      ? await prisma.bill.findMany({
          where: { customerId: { in: ids } },
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
        })
      : [];

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

    const items = customers.map((customer) => {
      const totals = getTotals(customer.id);
      const initialAFN = Number((customer as { initialDebtAFN?: unknown }).initialDebtAFN ?? 0);
      const initialUSD = Number((customer as { initialDebtUSD?: unknown }).initialDebtUSD ?? 0);
      const safeInitialAFN = Number.isFinite(initialAFN) ? initialAFN : 0;
      const safeInitialUSD = Number.isFinite(initialUSD) ? initialUSD : 0;
      const remainingInitialAFN = Math.max(safeInitialAFN - totals.initialPaidAFN, 0);
      const remainingInitialUSD = Math.max(safeInitialUSD - totals.initialPaidUSD, 0);
      const debtAFN = totals.totalAFN - totals.paidAFN + remainingInitialAFN;
      const debtUSD = totals.totalUSD - totals.paidUSD + remainingInitialUSD;
      return {
        ...customer,
        initialDebtAFN: safeInitialAFN.toString(),
        initialDebtUSD: safeInitialUSD.toString(),
        debtAFN: debtAFN.toString(),
        debtUSD: debtUSD.toString(),
        paidAFN: totals.paidAFN.toString(),
        paidUSD: totals.paidUSD.toString(),
      };
    });

    return NextResponse.json(
      { items, total, page, pageSize },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Customer name must be unique" },
          { status: 409 }
        );
      }
    }
    console.error("Fetch paged customers error:", error);

    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
