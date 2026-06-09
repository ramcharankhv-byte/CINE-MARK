/*
  Warnings:

  - You are about to drop the column `movieId` on the `Watchlist` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Watchlist` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Watchlist" DROP CONSTRAINT "Watchlist_movieId_fkey";

-- DropIndex
DROP INDEX "Watchlist_userId_movieId_key";

-- AlterTable
ALTER TABLE "Watchlist" DROP COLUMN "movieId";

-- CreateTable
CREATE TABLE "_MovieToWatchlist" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MovieToWatchlist_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MovieToWatchlist_B_index" ON "_MovieToWatchlist"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_userId_key" ON "Watchlist"("userId");

-- AddForeignKey
ALTER TABLE "_MovieToWatchlist" ADD CONSTRAINT "_MovieToWatchlist_A_fkey" FOREIGN KEY ("A") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieToWatchlist" ADD CONSTRAINT "_MovieToWatchlist_B_fkey" FOREIGN KEY ("B") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
