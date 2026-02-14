-- DropForeignKey
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_customerId_fkey";

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "tempCustomerName" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
