-- Reconcile the database with schema.prisma.
--
-- The live database was inspected before this was written. It had drifted from
-- the schema in four ways, each of which broke something in the application:
--
--   1. User.googleId was NOT NULL. Supabase Auth never supplies a Google id,
--      so every new-user insert failed. This is why signing in produced 401s.
--   2. The WatchlistStatus enum and Watchlist.status column had been dropped by
--      20260613103745_final, but watchlist.services.js writes status on create
--      and the UI renders it, so creating a watchlist failed.
--   3. Watchlist.userId still carried a UNIQUE index, limiting every user to a
--      single watchlist. The migration that fixes this, 20260609061637, had
--      never been applied; it now runs immediately before this one.
--   4. ChatSession and ChatMessage were declared in the schema but no migration
--      ever created them.
--
-- Every statement is guarded, so this is safe from any of those starting
-- states. Nothing is dropped: no table, no column, no row. The chat tables and
-- the googleId column are deliberately preserved rather than removed, so the
-- dormant ML service stays revivable.

-- 1. Supabase owns identity now and never supplies a Google id. Keeping the
--    column (the ML service reads it) but relaxing it is what unblocks user
--    creation. The UNIQUE index stays; Postgres permits unlimited NULLs in a
--    unique index, so any number of Supabase users can coexist with no id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'User'
       AND column_name  = 'googleId'
       AND is_nullable  = 'NO'
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "googleId" DROP NOT NULL;
  END IF;
END $$;

-- 2. Restore the watchlist status enum and column.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typname = 'WatchlistStatus'
  ) THEN
    CREATE TYPE "WatchlistStatus" AS ENUM ('PLAN_TO_WATCH', 'COMPLETED');
  END IF;
END $$;

ALTER TABLE "Watchlist"
  ADD COLUMN IF NOT EXISTS "status" "WatchlistStatus" NOT NULL DEFAULT 'PLAN_TO_WATCH';

-- 3. Belt and braces on the one-watchlist-per-user constraint. The preceding
--    migration removes it, but this is idempotent and guarantees the end state
--    regardless of the order in which pending migrations are applied.
DROP INDEX IF EXISTS "Watchlist_userId_key";
CREATE INDEX IF NOT EXISTS "Watchlist_userId_idx" ON "Watchlist"("userId");

-- 4. schema.prisma has always declared these two models, but no migration ever
--    created them. Creating them makes the schema, the migration history and
--    the database agree, which removes the drift permanently and keeps the
--    dormant ML service able to run again without further schema work.
CREATE TABLE IF NOT EXISTS "ChatSession" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "title"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id"        TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role"      TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "movies"    JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChatSession_userId_idx"    ON "ChatSession"("userId");
CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so these are guarded by name.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatSession_userId_fkey'
  ) THEN
    ALTER TABLE "ChatSession"
      ADD CONSTRAINT "ChatSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_sessionId_fkey'
  ) THEN
    ALTER TABLE "ChatMessage"
      ADD CONSTRAINT "ChatMessage_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
