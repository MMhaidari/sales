import { NextRequest, NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

const INITIAL_DEBT_NOTE = "Initial debt adjustment";
const CUSTOMER_PAYMENT_NOTE = "Customer payment adjustment";

function handleError(error: unknown) {
  console.error(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Bill number already exists" },
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

type UpdateBillItemInput = {
  productId: string;
  numberOfPackages: number;
  unitPrice?: number;
};

type UpdateBillInput = {
  billNumber?: string | null;
  sherkatStock?: boolean;
  mandawiCheck?: boolean;
  mandawiCheckNumber?: string | null;
  billDate?: string;
  note?: string | null;
  items?: UpdateBillItemInput[];
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Bill id is required" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as UpdateBillInput | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { billNumber, sherkatStock, mandawiCheck, mandawiCheckNumber, billDate, note, items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one bill item is required" },
        { status: 400 }
      );
    }

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.note === INITIAL_DEBT_NOTE) {
      return NextResponse.json(
        { error: "Initial debt bills cannot be edited" },
        { status: 400 }
      );
    }

    if (billNumber !== undefined && billNumber !== null && typeof billNumber !== "string") {
      return NextResponse.json(
        { error: "Bill number must be a string" },
        { status: 400 }
      );
    }

    const billNumberProvided = billNumber !== undefined;
    const normalizedBillNumber = billNumberProvided
      ? billNumber?.trim() || null
      : bill.billNumber;
    if (!normalizedBillNumber) {
      return NextResponse.json(
        { error: "Bill number is required" },
        { status: 400 }
      );
    }
    if (normalizedBillNumber && !/^[0-9]+$/.test(normalizedBillNumber)) {
      return NextResponse.json(
        { error: "Bill number must be digits only" },
        { status: 400 }
      );
    }

    const existingBill = await prisma.bill.findFirst({
      where: {
        billNumber: normalizedBillNumber,
        NOT: { id },
      },
      select: { id: true },
    });
    if (existingBill) {
      return NextResponse.json(
        { error: "Bill number already exists" },
        { status: 409 }
      );
    }

    if (
      mandawiCheckNumber !== undefined &&
      mandawiCheckNumber !== null &&
      typeof mandawiCheckNumber !== "string"
    ) {
      return NextResponse.json(
        { error: "Mandawi check number must be a string" },
        { status: 400 }
      );
    }

    const mandawiNumberProvided = mandawiCheckNumber !== undefined;
    const normalizedMandawiCheckNumber = mandawiNumberProvided
      ? mandawiCheckNumber?.trim() || null
      : bill.mandawiCheckNumber;
    if (
      normalizedMandawiCheckNumber &&
      !/^[0-9]+$/.test(normalizedMandawiCheckNumber)
    ) {
      return NextResponse.json(
        { error: "Mandawi check number must be digits only" },
        { status: 400 }
      );
    }

    const normalizedItems = items
      .filter(
        (item) =>
          item &&
          typeof item.productId === "string" &&
          Number.isFinite(item.numberOfPackages) &&
          item.numberOfPackages > 0 &&
          (item.unitPrice === undefined ||
            (Number.isFinite(item.unitPrice) && item.unitPrice > 0))
      )
      .map((item) => ({
        productId: item.productId,
        numberOfPackages: Math.floor(item.numberOfPackages),
        unitPrice: item.unitPrice,
      }));

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { error: "Invalid bill items" },
        { status: 400 }
      );
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        currentPricePerPackage: true,
        currencyType: true,
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    for (const item of normalizedItems) {
      if (!productMap.has(item.productId)) {
        return NextResponse.json(
          { error: "Product not found for one or more items" },
          { status: 400 }
        );
      }
    }

    const enrichedItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId)!;
      const fallbackPrice = Number(product.currentPricePerPackage.toString());
      const unitPrice =
        item.unitPrice == null || !Number.isFinite(item.unitPrice)
          ? fallbackPrice
          : item.unitPrice;
      return { ...item, unitPrice, product };
    });

    let totalAFN = 0;
    let totalUSD = 0;
    for (const item of enrichedItems) {
      const amount = item.unitPrice * item.numberOfPackages;
      if (item.product.currencyType === "AFN") totalAFN += amount;
      if (item.product.currencyType === "USD") totalUSD += amount;
    }

    let paidAFN = Number(bill.paidAFN.toString());
    let paidUSD = Number(bill.paidUSD.toString());
    for (const payment of bill.payments) {
      const amount = Number(payment.amountPaid.toString());
      if (payment.currency === "AFN") paidAFN += amount;
      if (payment.currency === "USD") paidUSD += amount;
    }

    if (paidAFN > totalAFN || paidUSD > totalUSD) {
      return NextResponse.json(
        { error: "Paid amounts cannot exceed totals" },
        { status: 400 }
      );
    }

    const nextStatus =
      paidAFN >= totalAFN && paidUSD >= totalUSD
        ? "PAID"
        : paidAFN > 0 || paidUSD > 0
        ? "PARTIAL"
        : "UNPAID";

    const nextSherkatStock =
      typeof sherkatStock === "boolean" ? sherkatStock : bill.sherkatStock;
    const nextMandawiCheck =
      typeof mandawiCheck === "boolean" ? mandawiCheck : bill.mandawiCheck;
    const finalMandawiCheck =
      Boolean(nextMandawiCheck) || Boolean(normalizedMandawiCheckNumber);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.billItem.deleteMany({ where: { billId: id } });
      await tx.stock.deleteMany({ where: { billId: id, sourceType: "BILL" } });

      const nextBill = await tx.bill.update({
        where: { id },
        data: {
          billNumber: normalizedBillNumber,
          status: nextStatus,
          sherkatStock: nextSherkatStock,
          mandawiCheck: finalMandawiCheck,
          mandawiCheckNumber: normalizedMandawiCheckNumber,
          billDate: billDate ? new Date(billDate) : bill.billDate,
          note:
            typeof note === "string" ? note : note === null ? null : bill.note,
          items: {
            create: enrichedItems.map((item) => {
              const totalAmount = new Prisma.Decimal(item.unitPrice).mul(
                item.numberOfPackages
              );
              return {
                productId: item.productId,
                numberOfPackages: item.numberOfPackages,
                unitPrice: new Prisma.Decimal(item.unitPrice),
                totalAmount,
                currency: item.product.currencyType,
              };
            }),
          },
          stockMovements: nextSherkatStock
            ? undefined
            : {
                create: normalizedItems.map((item) => ({
                  productId: item.productId,
                  quantityChange: -Math.abs(item.numberOfPackages),
                  movementType: "OUT",
                  sourceType: "BILL",
                  note: "Bill deduction",
                })),
              },
        },
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
        },
      });

      return nextBill;
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Bill id is required" }, { status: 400 });
    }

    const bill = await prisma.bill.findUnique({
      where: { id },
      select: { id: true, note: true },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.note === INITIAL_DEBT_NOTE || bill.note === CUSTOMER_PAYMENT_NOTE) {
      return NextResponse.json(
        { error: "System bills cannot be deleted" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { billId: id } });
      await tx.billItem.deleteMany({ where: { billId: id } });
      await tx.stock.deleteMany({ where: { billId: id, sourceType: "BILL" } });
      await tx.bill.delete({ where: { id } });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
