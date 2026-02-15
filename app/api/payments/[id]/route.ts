import { NextRequest, NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../../generated/prisma/client";

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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Payment id is required" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        billId: true,
        bill: {
          select: {
            id: true,
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
                id: true,
                currency: true,
                amountPaid: true,
              },
            },
          },
        },
      },
    });

    if (!payment || !payment.bill) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const bill = payment.bill;
    const remainingPayments = bill.payments.filter((entry) => entry.id !== id);
    const isAdjustmentBill = bill.note === "Customer payment adjustment";

    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id } });

      if (isAdjustmentBill && bill.items.length === 0 && remainingPayments.length === 0) {
        await tx.bill.delete({ where: { id: bill.id } });
        return;
      }

      let totalAFN = 0;
      let totalUSD = 0;
      for (const item of bill.items) {
        const amount = Number(item.totalAmount.toString());
        if (item.currency === "AFN") totalAFN += amount;
        if (item.currency === "USD") totalUSD += amount;
      }

      let paidAFN = Number(bill.paidAFN.toString());
      let paidUSD = Number(bill.paidUSD.toString());
      for (const entry of remainingPayments) {
        const amount = Number(entry.amountPaid.toString());
        if (entry.currency === "AFN") paidAFN += amount;
        if (entry.currency === "USD") paidUSD += amount;
      }

      const nextStatus =
        paidAFN >= totalAFN && paidUSD >= totalUSD
          ? "PAID"
          : paidAFN > 0 || paidUSD > 0
          ? "PARTIAL"
          : "UNPAID";

      await tx.bill.update({
        where: { id: bill.id },
        data: { status: nextStatus },
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
