import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { error: "Product id is required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const history = await prisma.stock.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quantityChange: true,
        movementType: true,
        sourceType: true,
        isContainer: true,
        containerNumber: true,
        driverName: true,
        billOfLadingNumber: true,
        arrivalDate: true,
        leakPackages: true,
        note: true,
        billId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        productId: product.id,
        productName: product.name,
        history: history.map((entry) => ({
          id: entry.id,
          quantityChange: entry.quantityChange,
          movementType: entry.movementType,
          sourceType: entry.sourceType,
          isContainer: entry.isContainer,
          containerNumber: entry.containerNumber,
          driverName: entry.driverName,
          billOfLadingNumber: entry.billOfLadingNumber,
          arrivalDate: entry.arrivalDate ? entry.arrivalDate.toISOString() : null,
          leakPackages: entry.leakPackages,
          note: entry.note,
          billId: entry.billId,
          createdAt: entry.createdAt.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
