#!/usr/bin/env node
/**
 * Read-only inspection of the live database.
 *
 * The schema was at some point hand-applied outside of `prisma migrate`, so the
 * state of the migration ledger cannot be assumed. This script reports what is
 * actually there and recommends which reconciliation path to take. It issues
 * SELECTs only and never writes.
 *
 * Run with: npm run db:inspect   (from Backend/)
 */
import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "No connection string. Set DIRECT_URL (preferred) or DATABASE_URL in Backend/.env",
  );
  process.exit(1);
}

if (!process.env.DIRECT_URL) {
  console.warn(
    "Warning: DIRECT_URL is not set, falling back to DATABASE_URL.\n" +
      "Inspection works either way, but migrations must use the direct endpoint.\n",
  );
}

const EXPECTED_MIGRATIONS = [
  "20260603100137_init",
  "20260603155531_updated_user",
  "20260604083814_updated_refresh_userschema",
  "20260604085507_add_refresh_token",
  "20260604152230_updated_schema",
  "20260604163949_updated_schema",
  "20260605090727_watchlist_updated",
  "20260605104816_watchlist_updated",
  "20260605105151_schema_updated",
  "20260609061637_remove_watchlist_unique_userid",
];

const APP_TABLES = [
  "User",
  "Movie",
  "Watchlist",
  "_MovieToWatchlist",
  "ChatSession",
  "ChatMessage",
];

const client = new pg.Client({ connectionString });

const heading = (text) => console.log(`\n${text}\n${"-".repeat(text.length)}`);

async function main() {
  await client.connect();

  // 1. Which tables exist?
  const { rows: tableRows } = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name`,
  );
  const tables = tableRows.map((r) => r.table_name);

  heading("Tables in public schema");
  console.log(tables.length ? tables.join(", ") : "(none - empty database)");

  // 2. Does the Prisma migration ledger exist, and what does it record?
  const {
    rows: [{ ledger }],
  } = await client.query(
    `SELECT to_regclass('public._prisma_migrations') AS ledger`,
  );

  let appliedMigrations = [];
  let ledgerUnfinished = [];

  heading("Prisma migration ledger");
  if (!ledger) {
    console.log("_prisma_migrations does not exist.");
  } else {
    const { rows } = await client.query(
      `SELECT migration_name, finished_at, rolled_back_at
         FROM "_prisma_migrations" ORDER BY started_at`,
    );
    appliedMigrations = rows
      .filter((r) => r.finished_at && !r.rolled_back_at)
      .map((r) => r.migration_name);
    ledgerUnfinished = rows.filter((r) => !r.finished_at || r.rolled_back_at);

    console.log(`${rows.length} row(s) recorded, ${appliedMigrations.length} cleanly applied.`);
    const missing = EXPECTED_MIGRATIONS.filter(
      (m) => !appliedMigrations.includes(m),
    );
    if (missing.length) {
      console.log(`Not recorded as applied (${missing.length}):`);
      missing.forEach((m) => console.log(`  - ${m}`));
    }
    if (ledgerUnfinished.length) {
      console.log("Unfinished or rolled back:");
      ledgerUnfinished.forEach((r) =>
        console.log(`  - ${r.migration_name}`),
      );
    }
  }

  // 3. Row counts, so we know whether there is data worth protecting.
  heading("Row counts");
  const counts = {};
  for (const table of APP_TABLES) {
    if (!tables.includes(table)) {
      console.log(`${table.padEnd(20)} (table absent)`);
      continue;
    }
    const {
      rows: [{ count }],
    } = await client.query(`SELECT count(*)::int AS count FROM "${table}"`);
    counts[table] = count;
    console.log(`${table.padEnd(20)} ${count}`);
  }

  // 4. The column that actually blocks user creation.
  heading("User columns");
  let googleIdNullable = null;
  if (tables.includes("User")) {
    const { rows } = await client.query(
      `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'User'
        ORDER BY ordinal_position`,
    );
    rows.forEach((r) =>
      console.log(
        `${r.column_name.padEnd(16)} ${r.data_type.padEnd(28)} ${
          r.is_nullable === "YES" ? "nullable" : "NOT NULL"
        }`,
      ),
    );
    googleIdNullable =
      rows.find((r) => r.column_name === "googleId")?.is_nullable ?? "absent";
  } else {
    console.log("User table does not exist.");
  }

  // 5. Recommendation.
  heading("Assessment");

  const hasAppTables = tables.includes("User");
  const ledgerComplete =
    ledger &&
    EXPECTED_MIGRATIONS.every((m) => appliedMigrations.includes(m)) &&
    ledgerUnfinished.length === 0;

  if (!hasAppTables) {
    console.log("State: empty database.");
    console.log("Path:  prisma migrate deploy, then the reconciliation migration.");
  } else if (ledgerComplete) {
    console.log("State: migration history intact.");
    console.log("Path:  apply the reconciliation migration only.");
  } else {
    console.log("State: tables exist but the ledger is empty or incomplete.");
    console.log("Path:  baseline with `prisma migrate resolve --applied <name>`");
    console.log("       for each migration listed above as not recorded, then");
    console.log("       apply the reconciliation migration. This writes ledger");
    console.log("       rows only and runs no DDL.");
  }

  if (googleIdNullable === "NO") {
    console.log(
      "\nBlocker confirmed: User.googleId is NOT NULL. Supabase never supplies\n" +
        "a Google id, so user creation fails until the reconciliation migration\n" +
        "relaxes this column.",
    );
  } else if (googleIdNullable === "YES") {
    console.log("\nUser.googleId is already nullable; user creation is not blocked by it.");
  }

  const chatPresent =
    tables.includes("ChatSession") && tables.includes("ChatMessage");
  console.log(
    chatPresent
      ? "\nChat tables present. The ML service stays revivable; nothing will be dropped."
      : "\nChat tables absent. The reconciliation migration will create them so the\nschema, the history and the database agree, keeping the ML service revivable.",
  );

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(
    `\nTotal rows across app tables: ${totalRows}. Nothing in the plan drops data.`,
  );
}

main()
  .catch((err) => {
    console.error("\nInspection failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
