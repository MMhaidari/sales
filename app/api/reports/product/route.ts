import { NextRequest, NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

function handleError(error: unknown) {
  console.error(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const productId = url.searchParams.get("productId");
    const to = url.searchParams.get("to") || new Date().toISOString();
    const includeSherkat = url.searchParams.get("includeSherkat");
    const includeMandawi = url.searchParams.get("includeMandawi");

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const toDate = new Date(to);
    if (Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
    }

    const sherkatFilter =
      includeSherkat == null ? undefined : includeSherkat === "true" ? undefined : { sherkatStock: false };
    const mandawiFilter =
      includeMandawi == null ? undefined : includeMandawi === "true" ? undefined : { mandawiCheck: false };

    // Build where condition on bill
    const billWhere: any = { billDate: { lte: toDate } };
    if (sherkatFilter) Object.assign(billWhere, sherkatFilter);
    if (mandawiFilter) Object.assign(billWhere, mandawiFilter);

    const items = await prisma.billItem.findMany({
      where: {
        productId,
        bill: billWhere,
      },
      include: {
        bill: {
          include: {
            customer: { select: { id: true, name: true } },
          },
        },
        product: { select: { id: true, name: true, currentPricePerPackage: true, currencyType: true } },
      },
      orderBy: { bill: { billDate: "asc" } },
    });

    const rows = items.map((item) => ({
      id: item.id,
      billId: item.billId,
      billNumber: item.bill?.billNumber ?? null,
      billDate: item.bill?.billDate,
      customerName: item.bill?.customer?.name ?? item.bill?.tempCustomerName ?? null,
      numberOfPackages: item.numberOfPackages,
      unitPrice: Number(item.unitPrice),
      totalAmount: Number(item.totalAmount),
      currency: item.currency,
    }));

    const totals = rows.reduce(
      (acc, r) => {
        if (r.currency === "AFN") acc.totalAFN += r.totalAmount;
        if (r.currency === "USD") acc.totalUSD += r.totalAmount;
        acc.totalPackages += r.numberOfPackages;
        return acc;
      },
      { totalAFN: 0, totalUSD: 0, totalPackages: 0 }
    );

    return NextResponse.json({ items: rows, totals }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
