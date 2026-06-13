/*
  Warnings:

  - You are about to drop the column `status` on the `Watchlist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Watchlist" DROP COLUMN "status";

-- DropEnum
DROP TYPE "WatchlistStatus";
