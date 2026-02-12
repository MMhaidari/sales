/*
  Warnings:

  - You are about to drop the column `currency` on the `Product` table. All the data in the column will be lost.
  - Added the required column `currencyType` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "currency",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "currencyType" "Currency" NOT NULL;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
