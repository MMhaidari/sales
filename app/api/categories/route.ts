import { NextRequest, NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

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

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: "asc" },
        });
        return NextResponse.json(categories, { status: 200 });
    } catch (error) {
        console.error("Fetch categories error:", error);
        return NextResponse.json(
            { error: "Failed to fetch categories" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name } = await req.json();
        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const category = await prisma.category.create({
            data: { name: name.trim() },
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error("Create category error:", error);
        return NextResponse.json(
            { error: "Failed to create category" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const id = req.nextUrl.searchParams.get("id");
        const { name } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Category id is required" }, { status: 400 });
        }

        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const category = await prisma.category.update({
            where: { id },
            data: { name: name.trim() },
        });

        return NextResponse.json(category, { status: 200 });
    } catch (error) {
        console.error("Update category error:", error);
        return NextResponse.json(
            { error: "Failed to update category" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const id = req.nextUrl.searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Category id is required" }, { status: 400 });
        }

        const deleted = await prisma.category.delete({
            where: { id },
        });

        return NextResponse.json(deleted, { status: 200 });
    } catch (error) {
        console.error("Delete category error:", error);
        return NextResponse.json(
            { error: "Failed to delete category" },
            { status: 500 }
        );
    }
}