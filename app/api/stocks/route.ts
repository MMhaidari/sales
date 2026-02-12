import { NextRequest, NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma, StockMovementType, StockSourceType } from "../../generated/prisma/client";

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

type CreateStockInput = {
  productId?: string;
  quantityChange?: number;
  note?: string | null;
  isContainer?: boolean;
  containerNumber?: string;
  driverName?: string;
  billOfLadingNumber?: string;
  arrivalDate?: string;
  leakPackages?: number;
  items?: Array<{
    productId: string;
    quantityChange: number;
    leakPackages?: number;
  }>;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as CreateStockInput | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      productId,
      quantityChange,
      note,
      isContainer,
      containerNumber,
      driverName,
      billOfLadingNumber,
      arrivalDate,
      leakPackages,
      items,
    } = body;

    const normalizedContainer = Boolean(isContainer);

    if (normalizedContainer && Array.isArray(items) && items.length > 0) {
      const normalizedItems = items
        .filter(
          (item) =>
            item &&
            typeof item.productId === "string" &&
            Number.isFinite(item.quantityChange) &&
            item.quantityChange !== 0
        )
        .map((item) => ({
          productId: item.productId,
          quantityChange: Math.trunc(item.quantityChange),
          leakPackages:
            typeof item.leakPackages === "number" &&
            Number.isFinite(item.leakPackages)
              ? Math.trunc(item.leakPackages)
              : null,
        }));

      if (normalizedItems.length === 0) {
        return NextResponse.json(
          { error: "Container items are required" },
          { status: 400 }
        );
      }

      const created = await prisma.$transaction(
        normalizedItems.map((item) =>
          prisma.stock.create({
            data: {
              productId: item.productId,
              quantityChange: item.quantityChange,
              movementType:
                item.quantityChange > 0
                  ? StockMovementType.IN
                  : StockMovementType.OUT,
              sourceType: StockSourceType.CONTAINER,
              isContainer: true,
              containerNumber: containerNumber?.trim() || null,
              driverName: driverName?.trim() || null,
              billOfLadingNumber: billOfLadingNumber?.trim() || null,
              arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
              leakPackages: item.leakPackages,
              note: typeof note === "string" ? note : null,
            },
          })
        )
      );

      return NextResponse.json(
        { success: true, createdCount: created.length },
        { status: 201 }
      );
    }

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { error: "Product id is required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(quantityChange) || quantityChange === 0) {
      return NextResponse.json(
        { error: "Quantity change must be a non-zero number" },
        { status: 400 }
      );
    }

    const normalizedQuantity = Math.trunc(quantityChange!);
    const movementType =
      normalizedQuantity > 0 ? StockMovementType.IN : StockMovementType.OUT;
    const sourceType = normalizedContainer
      ? StockSourceType.CONTAINER
      : StockSourceType.MANUAL;

    await prisma.stock.create({
      data: {
        productId,
        quantityChange: normalizedQuantity,
        movementType,
        sourceType,
        isContainer: normalizedContainer,
        containerNumber: containerNumber?.trim() || null,
        driverName: driverName?.trim() || null,
        billOfLadingNumber: billOfLadingNumber?.trim() || null,
        arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
        leakPackages:
          typeof leakPackages === "number" && Number.isFinite(leakPackages)
            ? Math.trunc(leakPackages)
            : null,
        note: typeof note === "string" ? note : null,
      },
    });

    return NextResponse.json({ success: true, createdCount: 1 }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        stockMovements: {
          select: { quantityChange: true },
        },
      },
    });

    const payload = products.map((product) => {
      const balance = product.stockMovements.reduce(
        (sum, movement) => sum + Number(movement.quantityChange),
        0
      );
      return {
        productId: product.id,
        productName: product.name,
        packagesAvailable: balance,
      };
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
