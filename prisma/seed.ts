import { PrismaClient, Prisma, BillStatus } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

/* -------------------- SEED DATA -------------------- */

const customerData: Prisma.CustomerCreateInput[] = [
  {
    name: "Ahmad Khan",
    phoneNumber: "0700123456",
    note: "Wholesale customer",
    bills: {
      create: [
        {
          status: BillStatus.PARTIAL,
          billDate: new Date("2026-02-01"),
          note: "Will pay remaining next week",
          items: {
            create: [
              {
                numberOfPackages: 2,
                unitPrice: 600,
                totalAmount: 1200,
                currency: "AFN",
                product: {
                  create: {
                    name: "Cement 50kg",
                    currentPricePerPackage: 600,
                    currencyType: "AFN",
                  },
                },
              },
            ],
          },
          payments: {
            create: [
              {
                amountPaid: 300,
                currency: "AFN",
                paymentMethod: "Cash",
                note: "First payment",
              },
              {
                amountPaid: 200,
                currency: "AFN",
                paymentMethod: "Bank Transfer",
                note: "Second payment",
              },
            ],
          },
        } as Prisma.BillCreateWithoutCustomerInput,
      ],
    },
  },

  {
    name: "Sara Ali",
    phoneNumber: "0799988877",
    bills: {
      create: [
        {
          status: BillStatus.PAID,
          billDate: new Date("2026-02-02"),
          items: {
            create: [
              {
                numberOfPackages: 1,
                unitPrice: 1200,
                totalAmount: 1200,
                currency: "AFN",
                product: {
                  create: {
                    name: "Steel Rod",
                    currentPricePerPackage: 1200,
                    currencyType: "AFN",
                  },
                },
              },
            ],
          },
          payments: {
            create: [
              {
                amountPaid: 1200,
                currency: "AFN",
                paymentMethod: "Cash",
              },
            ],
          },
        } as Prisma.BillCreateWithoutCustomerInput,
      ],
    },
  },
];

/* -------------------- RUN SEED -------------------- */

export async function main() {
  for (const customer of customerData) {
    await prisma.customer.create({
      data: customer,
    });
  }
}

main()
  .then(() => console.log("✅ Seed completed"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
