import { NextRequest, NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../../generated/prisma/client";

// Safe Prisma singleton for hot reloads in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

// Helper to handle errors
function handleError(error: unknown) {
  console.error(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Known Prisma errors (like unique constraint violation)
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 400 }
    );
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    // Validation errors
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  // Fallback for unexpected errors
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

// Create a new product
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, currentPricePerPackage, currencyType, categoryId } =
      body as {
        name?: unknown;
        currentPricePerPackage?: unknown;
        currencyType?: unknown;
        categoryId?: unknown;
      };

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    const parsedPrice =
      typeof currentPricePerPackage === "string"
        ? Number(currentPricePerPackage)
        : currentPricePerPackage;

    if (!Number.isFinite(parsedPrice)) {
      return NextResponse.json(
        { error: "Price must be a number" },
        { status: 400 }
      );
    }

    if (Number(parsedPrice) <= 0) {
      return NextResponse.json(
        { error: "Price must be a positive number" },
        { status: 400 }
      );
    }

    if (currencyType !== "AFN" && currencyType !== "USD") {
      return NextResponse.json(
        { error: "Currency must be AFN or USD" },
        { status: 400 }
      );
    }

    if (categoryId != null && typeof categoryId !== "string") {
      return NextResponse.json(
        { error: "Category id must be a string" },
        { status: 400 }
      );
    }

    const normalizedCategoryId = categoryId?.trim() || null;

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        currentPricePerPackage: parsedPrice as number,
        currencyType,
        categoryId: normalizedCategoryId,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

// Get all products
export async function GET() {
  try {
    const products = await prisma.product.findMany();
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

// Update a product by ID
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, name, currentPricePerPackage, currencyType, categoryId } =
      body as {
        id?: unknown;
        name?: unknown;
        currentPricePerPackage?: unknown;
        currencyType?: unknown;
        categoryId?: unknown;
      };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const data: Prisma.ProductUncheckedUpdateInput = {};

    if (name != null) {
      if (typeof name !== "string") {
        return NextResponse.json(
          { error: "Product name must be a string" },
          { status: 400 }
        );
      }
      data.name = name.trim();
    }

    if (currentPricePerPackage != null) {
      const parsedPrice =
        typeof currentPricePerPackage === "string"
          ? Number(currentPricePerPackage)
          : currentPricePerPackage;

      if (!Number.isFinite(parsedPrice)) {
        return NextResponse.json(
          { error: "Price must be a number" },
          { status: 400 }
        );
      }

      if (Number(parsedPrice) <= 0) {
        return NextResponse.json(
          { error: "Price must be a positive number" },
          { status: 400 }
        );
      }

      data.currentPricePerPackage = parsedPrice as number;
    }

    if (currencyType != null) {
      if (currencyType !== "AFN" && currencyType !== "USD") {
        return NextResponse.json(
          { error: "Currency must be AFN or USD" },
          { status: 400 }
        );
      }

      data.currencyType = currencyType;
    }

    if (categoryId !== undefined) {
      if (categoryId === null) {
        data.categoryId = null;
      } else if (typeof categoryId === "string") {
        data.categoryId = categoryId.trim() || null;
      } else {
        return NextResponse.json(
          { error: "Category id must be a string" },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

// Delete a product by ID
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id } = body as { id?: unknown };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
