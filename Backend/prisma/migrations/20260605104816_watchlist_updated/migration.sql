/*
  Warnings:

  - The values [WATCHING,DROPPED] on the enum `WatchlistStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WatchlistStatus_new" AS ENUM ('PLAN_TO_WATCH', 'COMPLETED');
ALTER TABLE "public"."Watchlist" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Watchlist" ALTER COLUMN "status" TYPE "WatchlistStatus_new" USING ("status"::text::"WatchlistStatus_new");
ALTER TYPE "WatchlistStatus" RENAME TO "WatchlistStatus_old";
ALTER TYPE "WatchlistStatus_new" RENAME TO "WatchlistStatus";
DROP TYPE "public"."WatchlistStatus_old";
ALTER TABLE "Watchlist" ALTER COLUMN "status" SET DEFAULT 'PLAN_TO_WATCH';
COMMIT;
