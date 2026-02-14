import { NextRequest, NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Prisma,
  Currency,
  BillStatus,
  StockMovementType,
  StockSourceType,
} from "../../generated/prisma/client";

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

function asDecimal(value: unknown, field: string) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") return value;
  throw new Error(`Invalid decimal for ${field}`);
}

function asDate(value: unknown, field: string) {
  if (typeof value !== "string") throw new Error(`Invalid date for ${field}`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date for ${field}`);
  return date;
}

function expectArray<T>(value: unknown, field: string): T[] {
  if (!Array.isArray(value)) throw new Error(`Missing array for ${field}`);
  return value as T[];
}

function asEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`Invalid enum value for ${field}`);
  }
  return value as T;
}

export async function GET() {
  try {
    const [
      customers,
      categories,
      products,
      bills,
      billItems,
      payments,
      stocks,
    ] = await Promise.all([
      prisma.customer.findMany(),
      prisma.category.findMany(),
      prisma.product.findMany(),
      prisma.bill.findMany(),
      prisma.billItem.findMany(),
      prisma.payment.findMany(),
      prisma.stock.findMany(),
    ]);

    const payload = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: 1,
      },
      data: {
        customers: customers.map((item) => ({
          ...item,
          totalDebtAmount: item.totalDebtAmount.toString(),
          totalPaidAmount: item.totalPaidAmount.toString(),
          initialDebtAFN: item.initialDebtAFN.toString(),
          initialDebtUSD: item.initialDebtUSD.toString(),
          createdAt: item.createdAt.toISOString(),
        })),
        categories: categories.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
        products: products.map((item) => ({
          ...item,
          currentPricePerPackage: item.currentPricePerPackage.toString(),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        bills: bills.map((item) => ({
          ...item,
          tempCustomerName: item.tempCustomerName ?? null,
          billDate: item.billDate.toISOString(),
          createdAt: item.createdAt.toISOString(),
        })),
        billItems: billItems.map((item) => ({
          ...item,
          unitPrice: item.unitPrice.toString(),
          totalAmount: item.totalAmount.toString(),
        })),
        payments: payments.map((item) => ({
          ...item,
          amountPaid: item.amountPaid.toString(),
          paymentDate: item.paymentDate.toISOString(),
        })),
        stocks: stocks.map((item) => ({
          ...item,
          arrivalDate: item.arrivalDate ? item.arrivalDate.toISOString() : null,
          createdAt: item.createdAt.toISOString(),
        })),
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          data?: Record<string, unknown>;
        }
      | null;

    if (!body || typeof body !== "object" || !body.data) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const customers = expectArray<Record<string, unknown>>(
      body.data.customers,
      "customers"
    ).map((item) => ({
      id: item.id as string,
      name: item.name as string,
      phoneNumber: item.phoneNumber as string,
      address: (item.address as string | null) ?? null,
      totalDebtAmount: asDecimal(item.totalDebtAmount, "totalDebtAmount"),
      totalPaidAmount: asDecimal(item.totalPaidAmount, "totalPaidAmount"),
      initialDebtAFN: asDecimal(item.initialDebtAFN ?? 0, "initialDebtAFN"),
      initialDebtUSD: asDecimal(item.initialDebtUSD ?? 0, "initialDebtUSD"),
      note: (item.note as string | null) ?? null,
      createdAt: asDate(item.createdAt, "createdAt"),
    }));

    const categories = expectArray<Record<string, unknown>>(
      body.data.categories,
      "categories"
    ).map((item) => ({
      id: item.id as string,
      name: item.name as string,
      createdAt: asDate(item.createdAt, "createdAt"),
    }));

    const products = expectArray<Record<string, unknown>>(
      body.data.products,
      "products"
    ).map((item) => ({
      id: item.id as string,
      name: item.name as string,
      currentPricePerPackage: asDecimal(
        item.currentPricePerPackage,
        "currentPricePerPackage"
      ),
      currencyType: asEnum(item.currencyType, Object.values(Currency), "currencyType"),
      createdAt: asDate(item.createdAt, "createdAt"),
      updatedAt: asDate(item.updatedAt, "updatedAt"),
      categoryId: (item.categoryId as string | null) ?? null,
    }));

    const bills = expectArray<Record<string, unknown>>(
      body.data.bills,
      "bills"
    ).map((item) => ({
      id: item.id as string,
      customerId: (item.customerId as string | null) ?? null,
      tempCustomerName: (item.tempCustomerName as string | null) ?? null,
      billNumber: (item.billNumber as string | null) ?? null,
      status: asEnum(item.status, Object.values(BillStatus), "status"),
      sherkatStock: Boolean(item.sherkatStock),
      mandawiCheck: Boolean(item.mandawiCheck),
      mandawiCheckNumber: (item.mandawiCheckNumber as string | null) ?? null,
      billDate: asDate(item.billDate, "billDate"),
      note: (item.note as string | null) ?? null,
      createdAt: asDate(item.createdAt, "createdAt"),
    }));

    const billItems = expectArray<Record<string, unknown>>(
      body.data.billItems,
      "billItems"
    ).map((item) => ({
      id: item.id as string,
      billId: item.billId as string,
      productId: item.productId as string,
      numberOfPackages: item.numberOfPackages as number,
      unitPrice: asDecimal(item.unitPrice, "unitPrice"),
      currency: asEnum(item.currency, Object.values(Currency), "currency"),
      totalAmount: asDecimal(item.totalAmount, "totalAmount"),
    }));

    const payments = expectArray<Record<string, unknown>>(
      body.data.payments,
      "payments"
    ).map((item) => ({
      id: item.id as string,
      billId: item.billId as string,
      paymentNumber: (item.paymentNumber as string | null) ?? null,
      amountPaid: asDecimal(item.amountPaid, "amountPaid"),
      currency: asEnum(item.currency, Object.values(Currency), "currency"),
      paymentDate: asDate(item.paymentDate, "paymentDate"),
      paymentMethod: item.paymentMethod as string,
      note: (item.note as string | null) ?? null,
    }));

    const stocks = expectArray<Record<string, unknown>>(
      body.data.stocks,
      "stocks"
    ).map((item) => ({
      id: item.id as string,
      productId: item.productId as string,
      billId: (item.billId as string | null) ?? null,
      quantityChange: item.quantityChange as number,
      movementType: asEnum(
        item.movementType,
        Object.values(StockMovementType),
        "movementType"
      ),
      sourceType: asEnum(
        item.sourceType,
        Object.values(StockSourceType),
        "sourceType"
      ),
      isContainer: Boolean(item.isContainer),
      containerNumber: (item.containerNumber as string | null) ?? null,
      driverName: (item.driverName as string | null) ?? null,
      billOfLadingNumber: (item.billOfLadingNumber as string | null) ?? null,
      arrivalDate:
        typeof item.arrivalDate === "string" && item.arrivalDate
          ? asDate(item.arrivalDate, "arrivalDate")
          : null,
      leakPackages:
        typeof item.leakPackages === "number" && Number.isFinite(item.leakPackages)
          ? Math.trunc(item.leakPackages)
          : null,
      note: (item.note as string | null) ?? null,
      createdAt: asDate(item.createdAt, "createdAt"),
    }));

    await prisma.$transaction(async (tx) => {
      await tx.stock.deleteMany();
      await tx.billItem.deleteMany();
      await tx.payment.deleteMany();
      await tx.bill.deleteMany();
      await tx.product.deleteMany();
      await tx.category.deleteMany();
      await tx.customer.deleteMany();

      if (customers.length) await tx.customer.createMany({ data: customers });
      if (categories.length) await tx.category.createMany({ data: categories });
      if (products.length) await tx.product.createMany({ data: products });
      if (bills.length) await tx.bill.createMany({ data: bills });
      if (billItems.length) await tx.billItem.createMany({ data: billItems });
      if (payments.length) await tx.payment.createMany({ data: payments });
      if (stocks.length) await tx.stock.createMany({ data: stocks });
    });

    return NextResponse.json(
      {
        success: true,
        counts: {
          customers: customers.length,
          categories: categories.length,
          products: products.length,
          bills: bills.length,
          billItems: billItems.length,
          payments: payments.length,
          stocks: stocks.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
