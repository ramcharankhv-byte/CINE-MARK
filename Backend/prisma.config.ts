// Prisma CLI configuration.
//
// Note: no `datasource` block here on purpose. Setting one overrides the schema
// and would route every migration through DATABASE_URL (the pooled Neon
// endpoint), silently discarding the `directUrl` the schema declares. PgBouncer
// cannot hold the advisory lock that `prisma migrate` relies on, which produces
// half-applied migrations. Leaving this out lets the schema's own url/directUrl
// pair resolve correctly: pooled at runtime, direct for migrations.
//
// This file also disables Prisma's automatic .env discovery, so env loading is
// delegated to `dotenv/config` below. That resolves .env relative to the
// current working directory, meaning every `npx prisma` command must be run
// from inside Backend/, not the repository root.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
