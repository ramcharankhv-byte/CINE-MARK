# 🎬 CINE-MARK

A movie watchlist platform. Search the OMDB catalogue, curate personal
watchlists, and sign in with Google through Supabase.

Two services run: an Express API backed by Neon Postgres, and a Next.js
frontend. A third directory, `ML/`, holds a dormant FastAPI service that is
deliberately not running or deployed — see [`ML/README.md`](./ML/README.md).

---

## Architecture

- **Identity** lives in Supabase. The frontend performs Google OAuth entirely
  client-side and sends the resulting access token as a bearer token.
- **Data** lives in Neon Postgres, reached through Prisma. The backend verifies
  each bearer token with Supabase, then provisions that user into its own
  `User` table on their first authenticated request. `User.id` is always the
  Supabase UUID, which is what every `Watchlist.userId` references.
- **Movie data** comes from OMDB, proxied by the backend and cached in Upstash
  Redis. A movie is persisted locally the first time its detail page is opened
  or it is added to a watchlist.

```
Browser ──Google OAuth──> Supabase ──access token──> Browser
Browser ──Bearer token──> Express ──verify──> Supabase
                             │
                             ├──> Neon Postgres (users, movies, watchlists)
                             ├──> OMDB (search, details)
                             └──> Upstash Redis (search cache)
```

---

## Running it locally

You need Node 20 or newer. Both services read environment files that are
gitignored; copy the examples and fill them in.

### Backend

```bash
cd Backend
cp .env.example .env      # then fill in the values
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev               # http://localhost:8080
```

Every variable in `.env.example` is required. The server exits at boot and
names the first one that is missing.

Neon needs two connection strings. `DATABASE_URL` is the pooled endpoint, whose
hostname contains `-pooler`, and needs `pgbouncer=true`. `DIRECT_URL` is the
same host without `-pooler`. Migrations must use the direct endpoint, because
PgBouncer cannot hold the advisory lock Prisma relies on.

Run every Prisma command from inside `Backend/`. `prisma.config.ts` delegates
environment loading to `dotenv`, which resolves `.env` relative to the working
directory.

### Frontend

```bash
cd frontend
cp .env.example .env.local   # then fill in the values
npm install
npm run dev                  # http://localhost:3000
```

Without `.env.local` the Supabase client throws at module load and every page
fails to render.

### Supabase setup

In the Supabase dashboard: enable **Google** under Authentication → Providers,
supplying a Google OAuth client id and secret from the Google Cloud Console,
with Supabase's callback URL added to that client's authorized redirect URIs.
Then add `http://localhost:3000` to the allowed redirect URLs under
Authentication → URL Configuration.

Supabase is used for authentication only. No application data is stored there.

---

## Useful scripts

Run from `Backend/`:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API with reload on change |
| `npm start` | Start the API |
| `npm run db:inspect` | Read-only report on the live database: tables, migration ledger, row counts, and which reconciliation path applies |
| `npm run smoke` | Exercise the real service layer against the real database, OMDB and Redis, then clean up after itself |
| `npm run db:deploy` | Apply pending migrations |

`npm run smoke` is the quickest way to confirm the whole stack works without an
interactive sign-in, since it covers everything below the Supabase token
exchange.

---

## API

Base URL `/api/v1`. Every route except the two below requires
`Authorization: Bearer <supabase access token>`.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/` | ❌ | Service banner |
| `GET` | `/health` | ❌ | Liveness probe; does not touch the database |
| `GET` | `/api/v1/auth/me` | ✅ | Current user, provisioning them on first call |
| `GET` | `/api/v1/movie/search?query=&page=` | ✅ | Search OMDB by title |
| `GET` | `/api/v1/movie/:imdbID` | ✅ | Full movie details |
| `GET` | `/api/v1/watchlist?page=&limit=` | ✅ | List watchlists |
| `POST` | `/api/v1/watchlist` | ✅ | Create a watchlist from `{ name }` |
| `GET` | `/api/v1/watchlist/search?query=` | ✅ | Search watchlists by name |
| `GET` | `/api/v1/watchlist/:watchlistId` | ✅ | One watchlist with its movies |
| `DELETE` | `/api/v1/watchlist/:watchlistId` | ✅ | Delete a watchlist |
| `POST` | `/api/v1/watchlist/:watchlistId/:movieId` | ✅ | Add a movie |
| `DELETE` | `/api/v1/watchlist/:watchlistId/:movieId` | ✅ | Remove a movie |

`:movieId` is an IMDb id matching `tt` followed by digits. `:watchlistId` is a
UUID. Interactive documentation is served at `/api-docs`.

Successful responses are wrapped:

```json
{ "statusCode": 200, "data": { }, "message": "...", "success": true }
```

Errors are wrapped too:

```json
{ "success": false, "message": "Descriptive error message", "errors": [] }
```

| Status | Meaning |
| --- | --- |
| `400` | Validation failure |
| `401` | Missing, invalid, or expired token |
| `403` | Authenticated, but the resource belongs to someone else |
| `404` | Not found |
| `500` | Server error |

Search and list responses carry a `meta` object with `currentPage`, `limit`,
`totalPages`, `hasNextPage` and `hasPreviousPage`. Movie searches report
`totalResults`; watchlist listings report `totalItems`.

---

## Database

Three models are in active use, plus two kept for the dormant ML service.

**User** — `id` is the Supabase UUID. `googleId` and `refreshToken` are
leftovers from the previous Google OAuth implementation; both are nullable and
unused by the application, retained because the ML service reads `googleId`.

**Movie** — a local cache of OMDB records, unique on `imdbID`.

**Watchlist** — belongs to a user, with a many-to-many relation to `Movie`
through an implicit join table, and a `status` of `PLAN_TO_WATCH` or
`COMPLETED`. Users may have any number of watchlists.

**ChatSession** and **ChatMessage** — written only by the dormant ML service.

### Migrations

Apply them with `prisma migrate deploy`. Never run `prisma migrate dev` against
Neon: on any drift it offers a reset, which drops the schema, and it requires a
shadow database that cannot go through the pooler.

Two entries in the history are worth knowing about. `20260613103745_final` was
applied to the database but its directory had gone missing from the repository,
which left the local history permanently divergent; it has been reconstructed
from the live schema. `20260912000000_supabase_auth_reconcile` then repairs the
drift that had accumulated: it makes `googleId` nullable so Supabase users can
be created, restores the watchlist `status` column and its enum, and adds the
chat tables the schema had always declared. It drops nothing.

---

## Deployment

`render.yaml` defines the backend service only. Set every `sync: false`
variable in the Render dashboard, including `DIRECT_URL`, which the build needs
because it runs `prisma generate`. The frontend deploys separately to Vercel
with its three `NEXT_PUBLIC_` variables.

---

## Contributors

Built by [ramcharankhv-byte](https://github.com/ramcharankhv-byte) (backend) and
[Someshwar-prox](https://github.com/Someshwar-prox) (ML integration).

Licensed under ISC.
