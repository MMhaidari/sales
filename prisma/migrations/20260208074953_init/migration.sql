/*
  Warnings:

  - You are about to drop the column `currencyType` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `currencyType` on the `Sale` table. All the data in the column will be lost.
  - Added the required column `currency` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('AFN', 'USD');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "currency" "Currency" NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "currency" "Currency" NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "currencyType",
ADD COLUMN     "currency" "Currency" NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "currencyType",
ADD COLUMN     "currency" "Currency" NOT NULL;
