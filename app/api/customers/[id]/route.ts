import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Customer id is required" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const payments = await prisma.payment.findMany({
      where: { bill: { customerId: id } },
      orderBy: { paymentDate: "desc" },
    });

    const bills = await prisma.bill.findMany({
      where: { customerId: id },
      orderBy: { billDate: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                currentPricePerPackage: true,
                currencyType: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    let totalAFN = 0;
    let totalUSD = 0;
    let paidAFN = 0;
    let paidUSD = 0;
    let initialPaidAFN = 0;
    let initialPaidUSD = 0;

    for (const bill of bills) {
      const billPaidAFN = Number(bill.paidAFN.toString());
      const billPaidUSD = Number(bill.paidUSD.toString());
      if (bill.note === "Initial debt adjustment") {
        initialPaidAFN += billPaidAFN;
        initialPaidUSD += billPaidUSD;
        for (const payment of bill.payments) {
          const amount = Number(payment.amountPaid.toString());
          if (payment.currency === "AFN") initialPaidAFN += amount;
          if (payment.currency === "USD") initialPaidUSD += amount;
        }
        continue;
      }
      for (const item of bill.items) {
        const amount = Number(item.totalAmount.toString());
        if (item.currency === "AFN") totalAFN += amount;
        if (item.currency === "USD") totalUSD += amount;
      }
      paidAFN += billPaidAFN;
      paidUSD += billPaidUSD;
      for (const payment of bill.payments) {
        const amount = Number(payment.amountPaid.toString());
        if (payment.currency === "AFN") paidAFN += amount;
        if (payment.currency === "USD") paidUSD += amount;
      }
    }

    const initialAFN = Number((customer as { initialDebtAFN?: unknown }).initialDebtAFN ?? 0);
    const initialUSD = Number((customer as { initialDebtUSD?: unknown }).initialDebtUSD ?? 0);
    const safeInitialAFN = Number.isFinite(initialAFN) ? initialAFN : 0;
    const safeInitialUSD = Number.isFinite(initialUSD) ? initialUSD : 0;
    const remainingInitialAFN = Math.max(safeInitialAFN - initialPaidAFN, 0);
    const remainingInitialUSD = Math.max(safeInitialUSD - initialPaidUSD, 0);

    const totals = {
      initialDebtAFN: safeInitialAFN.toString(),
      initialDebtUSD: safeInitialUSD.toString(),
      debtAFN: (totalAFN - paidAFN + remainingInitialAFN).toString(),
      paidAFN: paidAFN.toString(),
      debtUSD: (totalUSD - paidUSD + remainingInitialUSD).toString(),
      paidUSD: paidUSD.toString(),
    };

    const payloadBills = bills.map((bill) => {
      let billTotalAFN = 0;
      let billTotalUSD = 0;

      const items = bill.items.map((item) => {
        const amount = Number(item.totalAmount.toString());
        if (item.currency === "AFN") billTotalAFN += amount;
        if (item.currency === "USD") billTotalUSD += amount;

        return {
          id: item.id,
          productId: item.productId,
          product: item.product
            ? {
                name: item.product.name,
                currentPricePerPackage:
                  item.product.currentPricePerPackage.toString(),
                currency: item.product.currencyType,
              }
            : null,
          numberOfPackages: item.numberOfPackages,
          unitPrice: item.unitPrice.toString(),
          currency: item.currency,
          totalAmount: item.totalAmount.toString(),
        };
      });

      return {
        id: bill.id,
        billNumber: bill.billNumber,
        sherkatStock: bill.sherkatStock,
        mandawiCheck: bill.mandawiCheck,
        mandawiCheckNumber: bill.mandawiCheckNumber,
        items,
        totalAFN: billTotalAFN.toString(),
        totalUSD: billTotalUSD.toString(),
        status: bill.status,
        billDate: bill.billDate.toISOString(),
        note: bill.note,
      };
    });

    return NextResponse.json(
      {
        ...customer,
        ...totals,
        bills: payloadBills,
        payments: payments.map((payment) => ({
          id: payment.id,
          billId: payment.billId,
          paymentNumber: payment.paymentNumber,
          amountPaid: payment.amountPaid.toString(),
          currency: payment.currency,
          paymentDate: payment.paymentDate.toISOString(),
          paymentMethod: payment.paymentMethod,
          note: payment.note,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch customer error:", error);

    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Customer id is required" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, phoneNumber, address, note, initialDebtAFN, initialDebtUSD } = body as {
      name?: unknown;
      phoneNumber?: unknown;
      address?: unknown;
      note?: unknown;
      initialDebtAFN?: unknown;
      initialDebtUSD?: unknown;
    };

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }

    if (
      phoneNumber !== undefined &&
      (typeof phoneNumber !== "string" || !phoneNumber.trim())
    ) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const parseNonNegative = (value: unknown) => {
      if (value == null || value === "") return null;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) return undefined;
      return parsed;
    };

    const nextInitialAFN = parseNonNegative(initialDebtAFN);
    const nextInitialUSD = parseNonNegative(initialDebtUSD);

    if (nextInitialAFN === undefined || nextInitialUSD === undefined) {
      return NextResponse.json(
        { error: "Initial debts must be non-negative numbers" },
        { status: 400 }
      );
    }

    const updateData: {
      name?: string;
      phoneNumber?: string;
      address?: string | null;
      note?: string | null;
      initialDebtAFN?: number;
      initialDebtUSD?: number;
    } = {};

    if (typeof name === "string") updateData.name = name.trim();
    if (typeof phoneNumber === "string") updateData.phoneNumber = phoneNumber.trim();
    if (address !== undefined) {
      updateData.address =
        typeof address === "string" && address.trim() ? address.trim() : null;
    }
    if (note !== undefined) {
      updateData.note = typeof note === "string" && note.trim() ? note.trim() : null;
    }

    if (nextInitialAFN !== null) updateData.initialDebtAFN = nextInitialAFN;
    if (nextInitialUSD !== null) updateData.initialDebtUSD = nextInitialUSD;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}
