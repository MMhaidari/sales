import { NextRequest, NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma, Currency } from "../../generated/prisma/client";

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

type CreateBillItemInput = {
	productId: string;
	numberOfPackages: number;
};

type CreateBillInput = {
	customerId: string;
	billNumber?: string;
	status?: "UNPAID" | "PARTIAL" | "PAID";
	sherkatStock?: boolean;
	mandawiCheck?: boolean;
	mandawiCheckNumber?: string;
	paidAFN?: string;
	paidUSD?: string;
	billDate?: string;
	note?: string | null;
	items: CreateBillItemInput[];
};

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => null)) as CreateBillInput | null;

		if (!body || typeof body !== "object") {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const {
			customerId,
			billNumber,
			status,
			sherkatStock,
			mandawiCheck,
			mandawiCheckNumber,
			paidAFN,
			paidUSD,
			billDate,
			note,
			items,
		} = body;

		if (!customerId || typeof customerId !== "string") {
			return NextResponse.json(
				{ error: "Customer id is required" },
				{ status: 400 }
			);
		}

		if (billNumber == null || typeof billNumber !== "string") {
			return NextResponse.json(
				{ error: "Bill number is required" },
				{ status: 400 }
			);
		}

		if (typeof billNumber !== "string") {
			return NextResponse.json(
				{ error: "Bill number must be a string" },
				{ status: 400 }
			);
		}

		const normalizedBillNumber = billNumber.trim();
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

		if (mandawiCheckNumber != null && typeof mandawiCheckNumber !== "string") {
			return NextResponse.json(
				{ error: "Mandawi check number must be a string" },
				{ status: 400 }
			);
		}

		const normalizedMandawiCheckNumber =
			mandawiCheckNumber?.trim() || null;
		if (normalizedMandawiCheckNumber && !/^[0-9]+$/.test(normalizedMandawiCheckNumber)) {
			return NextResponse.json(
				{ error: "Mandawi check number must be digits only" },
				{ status: 400 }
			);
		}

		const normalizedStatus = status ?? "UNPAID";
		if (!"UNPAID|PARTIAL|PAID".split("|").includes(normalizedStatus)) {
			return NextResponse.json(
				{ error: "Invalid bill status" },
				{ status: 400 }
			);
		}

		if (!Array.isArray(items) || items.length === 0) {
			return NextResponse.json(
				{ error: "At least one bill item is required" },
				{ status: 400 }
			);
		}

		const normalizedItems = items
			.filter(
				(item) =>
					item &&
					typeof item.productId === "string" &&
					Number.isFinite(item.numberOfPackages) &&
					item.numberOfPackages > 0
			)
			.map((item) => ({
				productId: item.productId,
				numberOfPackages: Math.floor(item.numberOfPackages),
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

		let totalAFN = 0;
		let totalUSD = 0;
		for (const item of normalizedItems) {
			const product = productMap.get(item.productId)!;
			const unitPrice = Number(product.currentPricePerPackage.toString());
			const amount = unitPrice * item.numberOfPackages;
			if (product.currencyType === "AFN") totalAFN += amount;
			if (product.currencyType === "USD") totalUSD += amount;
		}

		const parseAmount = (value: unknown) => {
			if (value == null) return null;
			const parsed = Number(value);
			return Number.isFinite(parsed) ? parsed : null;
		};

		const requestedPaidAFN = parseAmount(paidAFN);
		const requestedPaidUSD = parseAmount(paidUSD);

		let finalPaidAFN = 0;
		let finalPaidUSD = 0;

		if (normalizedStatus === "PAID") {
			finalPaidAFN = totalAFN;
			finalPaidUSD = totalUSD;
		} else if (normalizedStatus === "PARTIAL") {
			if (requestedPaidAFN == null || requestedPaidUSD == null) {
				return NextResponse.json(
					{ error: "Paid AFN and USD are required for partial bills" },
					{ status: 400 }
				);
			}
			if (requestedPaidAFN < 0 || requestedPaidUSD < 0) {
				return NextResponse.json(
					{ error: "Paid amounts cannot be negative" },
					{ status: 400 }
				);
			}
			if (requestedPaidAFN > totalAFN || requestedPaidUSD > totalUSD) {
				return NextResponse.json(
					{ error: "Paid amounts cannot exceed totals" },
					{ status: 400 }
				);
			}
			if (requestedPaidAFN === 0 && requestedPaidUSD === 0) {
				return NextResponse.json(
					{ error: "Provide a paid amount for partial bills" },
					{ status: 400 }
				);
			}
			finalPaidAFN = requestedPaidAFN;
			finalPaidUSD = requestedPaidUSD;
		}

		const finalMandawiCheck =
			Boolean(mandawiCheck) || Boolean(normalizedMandawiCheckNumber);

		const created = await prisma.bill.create({
			data: {
				customerId,
				billNumber: normalizedBillNumber,
				status: normalizedStatus,
				sherkatStock: Boolean(sherkatStock),
				mandawiCheck: finalMandawiCheck,
				mandawiCheckNumber: normalizedMandawiCheckNumber,
				billDate: billDate ? new Date(billDate) : new Date(),
				note: typeof note === "string" ? note : null,
				items: {
					create: normalizedItems.map((item) => {
						const product = productMap.get(item.productId)!;
						const unitPrice = product.currentPricePerPackage;
						const totalAmount = new Prisma.Decimal(unitPrice).mul(
							item.numberOfPackages
						);
						return {
							productId: item.productId,
							numberOfPackages: item.numberOfPackages,
							unitPrice,
							totalAmount,
							currency: product.currencyType,
						};
					}),
				},
				stockMovements: Boolean(sherkatStock)
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
				payments:
					finalPaidAFN || finalPaidUSD
						? {
								create: [
									...(finalPaidAFN
										? [
												{
													amountPaid: new Prisma.Decimal(finalPaidAFN),
													currency: Currency.AFN,
													paymentMethod:
														normalizedStatus === "PAID"
															? "Auto"
															: "Manual",
												},
										]
										: []),
									...(finalPaidUSD
										? [
												{
													amountPaid: new Prisma.Decimal(finalPaidUSD),
													currency: Currency.USD,
													paymentMethod:
														normalizedStatus === "PAID"
															? "Auto"
															: "Manual",
												},
										]
										: []),
								],
							}
						: undefined,
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

		return NextResponse.json(created, { status: 201 });
	} catch (error) {
		return handleError(error);
	}
}

export async function GET() {
	try {
		const bills = await prisma.bill.findMany({
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
			},
		});

		return NextResponse.json(bills, { status: 200 });
	} catch (error) {
		return handleError(error);
	}
}
