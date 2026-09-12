-- RECONSTRUCTED MIGRATION
--
-- This migration is recorded as applied in the database's _prisma_migrations
-- table, but its directory was missing from the repository, which left the
-- local history and the database permanently divergent and made
-- `prisma migrate deploy` refuse to run.
--
-- The contents below were reconstructed by diffing the live schema against the
-- state the preceding migrations produce. The only observable difference is
-- that Watchlist.status and the WatchlistStatus enum, both created in
-- 20260604152230_updated_schema and narrowed in 20260605104816_watchlist_updated,
-- no longer exist in the database.
--
-- It is already applied, so this file is never executed against the current
-- database. It exists so that the migration history replays to the same state,
-- and so Prisma stops reporting a divergence. The following migration,
-- 20260912000000_supabase_auth_reconcile, restores the status column, because
-- the application code and the UI both depend on it.

-- DropColumn
ALTER TABLE "Watchlist" DROP COLUMN IF EXISTS "status";

-- DropEnum
DROP TYPE IF EXISTS "WatchlistStatus";
