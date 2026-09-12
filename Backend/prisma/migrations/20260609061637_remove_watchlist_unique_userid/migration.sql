-- DropIndex
DROP INDEX "Watchlist_userId_key";

-- CreateIndex
CREATE INDEX "Watchlist_userId_idx" ON "Watchlist"("userId");
