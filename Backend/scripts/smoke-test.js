#!/usr/bin/env node
/**
 * End-to-end smoke test of everything below the Supabase token exchange.
 *
 * It exercises the real service layer against the real database and the real
 * OMDB and Upstash accounts, then removes everything it created. Use it to
 * confirm the stack works without needing an interactive Google sign-in.
 *
 * Run with: npm run smoke   (from Backend/)
 */
import "dotenv/config";

import { prisma, connectDB, disconnectDB } from "../src/config/db.js";
import {
  searchMoviesFromOMDB,
  addMovie,
  findMovie,
} from "../src/modules/movie/movie.services.js";
import * as watchlists from "../src/modules/watchlist/watchlist.services.js";

const TEST_ID = "00000000-0000-4000-8000-00000000d00d";
const TEST_EMAIL = "smoke-test@example.invalid";
const TEST_IMDB = "tt0133093"; // The Matrix

let pass = 0;
let fail = 0;

const check = (label, condition, detail = "") => {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${label}${detail ? ` - ${detail}` : ""}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label}${detail ? ` - ${detail}` : ""}`);
  }
};

const section = (title) => console.log(`\n${title}`);

async function cleanup() {
  await prisma.watchlist.deleteMany({ where: { userId: TEST_ID } });
  await prisma.user.deleteMany({ where: { id: TEST_ID } });
}

async function main() {
  await connectDB();
  await cleanup();

  section("1. User provisioning (the bug that broke every protected route)");
  const created = await prisma.user.upsert({
    where: { id: TEST_ID },
    create: {
      id: TEST_ID,
      email: TEST_EMAIL,
      name: "Smoke Test",
      picture: null,
    },
    update: { email: TEST_EMAIL },
    select: { id: true, email: true, name: true },
  });
  check("a Supabase-style user can be inserted", created.id === TEST_ID);
  check(
    "googleId is no longer required",
    (await prisma.user.findUnique({ where: { id: TEST_ID } }))?.googleId ===
      null,
  );

  const repeat = await prisma.user.upsert({
    where: { id: TEST_ID },
    create: { id: TEST_ID, email: TEST_EMAIL, name: "Smoke Test" },
    update: { email: TEST_EMAIL },
    select: { id: true },
  });
  check("repeat sign-in reuses the same row", repeat.id === created.id);

  section("2. Watchlists (was capped at one per user by a stale unique index)");
  const first = await watchlists.createWatchlist("Smoke list one", TEST_ID);
  check("first watchlist created", Boolean(first.id));
  check("status column present and defaulted", first.status === "PLAN_TO_WATCH",
    `status=${first.status}`);

  let secondOk = true;
  let second = null;
  try {
    second = await watchlists.createWatchlist("Smoke list two", TEST_ID);
  } catch (err) {
    secondOk = false;
    console.log(`        ${err.message}`);
  }
  check("a second watchlist is allowed for the same user", secondOk);

  section("3. OMDB search and Upstash cache");
  const t0 = Date.now();
  const search = await searchMoviesFromOMDB("matrix", 1);
  const coldMs = Date.now() - t0;
  check("OMDB search returns results", search.Response !== "False",
    `${search.totalResults ?? 0} total results`);

  const t1 = Date.now();
  await searchMoviesFromOMDB("matrix", 1);
  const warmMs = Date.now() - t1;
  check("repeat search is served from cache", warmMs <= coldMs,
    `cold ${coldMs}ms, warm ${warmMs}ms`);

  section("4. Movie detail and watchlist membership");
  let movie = await findMovie(TEST_IMDB);
  if (!movie) movie = await addMovie(TEST_IMDB);
  check("movie fetched and persisted", movie?.imdbID === TEST_IMDB,
    movie?.title);

  await watchlists.addMovieToWatchlist(first.id, TEST_IMDB, TEST_ID);
  const withMovie = await watchlists.getWatchlist(first.id, TEST_ID, 1, 10);
  check("movie added to watchlist", withMovie.movies.length === 1);
  check("pagination metadata present", withMovie.meta.totalItems === 1);

  const all = await watchlists.getAllWatchlists(TEST_ID, 1, 10);
  check("both watchlists listed", all.watchlists.length === (second ? 2 : 1),
    `${all.watchlists.length} found`);
  check("movie counts included", all.watchlists.some((w) => w._count.movies === 1));

  await watchlists.removeMovieFromWatchlist(first.id, TEST_IMDB, TEST_ID);
  const emptied = await watchlists.getWatchlist(first.id, TEST_ID, 1, 10);
  check("movie removed from watchlist", emptied.movies.length === 0);

  section("5. Ownership enforcement");
  let blocked = false;
  try {
    await watchlists.getWatchlist(first.id, "someone-else", 1, 10);
  } catch (err) {
    blocked = err.statusCode === 403;
  }
  check("another user cannot read the watchlist", blocked);

  section("6. Cleanup");
  await cleanup();
  const gone = await prisma.user.findUnique({ where: { id: TEST_ID } });
  check("test data removed", gone === null);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main()
  .catch((err) => {
    console.error("\nSmoke test aborted:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch(() => {});
    await disconnectDB();
  });
