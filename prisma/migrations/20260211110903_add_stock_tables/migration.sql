-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "StockSourceType" AS ENUM ('MANUAL', 'CONTAINER', 'BILL');

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "billId" TEXT,
    "quantityChange" INTEGER NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "sourceType" "StockSourceType" NOT NULL,
    "isContainer" BOOLEAN NOT NULL DEFAULT false,
    "containerNumber" TEXT,
    "driverName" TEXT,
    "billOfLadingNumber" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "leakPackages" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Stock_productId_idx" ON "Stock"("productId");

-- CreateIndex
CREATE INDEX "Stock_billId_idx" ON "Stock"("billId");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
