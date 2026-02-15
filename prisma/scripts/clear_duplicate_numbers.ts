import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function clearDuplicateBillNumbers() {
  const duplicates = await prisma.bill.groupBy({
    by: ["billNumber"],
    where: { billNumber: { not: null } },
    _count: { _all: true },
  });

  const targets = duplicates
    .filter((entry) => (entry._count?._all ?? 0) > 1)
    .map((entry) => entry.billNumber)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  let updated = 0;

  for (const billNumber of targets) {
    const bills = await prisma.bill.findMany({
      where: { billNumber },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const [, ...duplicatesToClear] = bills;
    if (duplicatesToClear.length === 0) continue;

    const ids = duplicatesToClear.map((bill) => bill.id);
    const result = await prisma.bill.updateMany({
      where: { id: { in: ids } },
      data: { billNumber: null },
    });

    updated += result.count;
  }

  return updated;
}

async function clearDuplicatePaymentNumbers() {
  const duplicates = await prisma.payment.groupBy({
    by: ["paymentNumber"],
    where: { paymentNumber: { not: null } },
    _count: { _all: true },
  });

  const targets = duplicates
    .filter((entry) => (entry._count?._all ?? 0) > 1)
    .map((entry) => entry.paymentNumber)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  let updated = 0;

  for (const paymentNumber of targets) {
    const payments = await prisma.payment.findMany({
      where: { paymentNumber },
      orderBy: { paymentDate: "asc" },
      select: { id: true },
    });

    const [, ...duplicatesToClear] = payments;
    if (duplicatesToClear.length === 0) continue;

    const ids = duplicatesToClear.map((payment) => payment.id);
    const result = await prisma.payment.updateMany({
      where: { id: { in: ids } },
      data: { paymentNumber: null },
    });

    updated += result.count;
  }

  return updated;
}

async function main() {
  const billsCleared = await clearDuplicateBillNumbers();
  const paymentsCleared = await clearDuplicatePaymentNumbers();

  console.log(
    `Cleared ${billsCleared} duplicate bill numbers and ${paymentsCleared} duplicate payment numbers.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
