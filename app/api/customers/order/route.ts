import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

type UpdateOrderInput = {
  orderedIds: string[];
};

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

export async function PUT(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as UpdateOrderInput | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds : [];
    const normalized = Array.from(
      new Set(orderedIds.filter((id) => typeof id === "string" && id.trim()))
    );

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "orderedIds must be a non-empty array" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await Promise.all(
        normalized.map((id, index) =>
          tx.customer.update({
            where: { id },
            data: { orderIndex: index },
          })
        )
      );
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
