# CINE-MARK → Production-Grade Backend Roadmap

> A mentor's guide to evolving the prototype into a scalable, production-ready REST API.

---

## What You Already Have (Solid Foundation)

- Google OAuth with JWT (access + refresh tokens)
- Prisma ORM with PostgreSQL
- Zod validation on request inputs
- Cookie-based refresh token handling
- Modular route structure
- Morgan for basic request logging

---

## 1. Folder Structure — Restructure First

Do this before anything else. Every other change plugs into this.

```
src/
  config/            ← env, db, redis, logger config
  middlewares/       ← auth, rateLimiter, errorHandler, validate
  modules/
    auth/
      auth.routes.js
      auth.controller.js
      auth.service.js
    movie/
      movie.routes.js
      movie.controller.js
      movie.service.js
    watchlist/
      watchlist.routes.js
      watchlist.controller.js
      watchlist.service.js
  utils/             ← ApiResponse, ApiError, asyncHandler
  jobs/              ← background tasks (future use)
  app.js             ← express setup + middleware mounting
  server.js          ← only starts the server, nothing else
```

**Rule:** Controller never touches Prisma directly. That's the service's job. Controller handles request/response only.

---

## 2. Security Layer

Add to `app.js` in this order:

### Helmet
- Install `helmet`
- Mounts as the very first middleware
- Sets ~12 HTTP security headers automatically (XSS protection, clickjacking, MIME sniffing, etc.)
- Read what each header does — don't blindly add it

### Rate Limiting
- Install `express-rate-limit`
- Create `src/middlewares/rateLimiter.js`
- Define two limiters:
  - **Global limiter** — applies to all routes (e.g. 100 req / 15 min)
  - **Auth limiter** — stricter, only on `/auth/*` routes (e.g. 10 req / 15 min)
- This prevents brute-force attacks on your login endpoints

### Compression
- Install `compression`
- Add as middleware in `app.js`
- Gzip-compresses all responses — especially valuable for movie search payloads

### CORS
- Already present — ensure `CORS_ORIGIN` comes from an env variable, never hardcoded

---

## 3. Logging — Replace Morgan with Pino

`morgan` is fine for development. `pino` is the production standard.

- Install `pino` and `pino-http`
- Install `pino-pretty` as a dev dependency
- Create `src/config/logger.js` — export a configured pino instance
- Replace morgan with `pino-http` in `app.js`
- In development: pipe through `pino-pretty` for readable logs
- In production: raw JSON (compatible with Datadog, Loki, CloudWatch)

Use the logger in your services and controllers for meaningful events:
- User created / logged in
- Movie fetched from cache vs OMDB API
- Watchlist operations

Use correct log levels: `info` for normal flow, `warn` for recoverable issues, `error` for failures.

---

## 4. Redis Caching

Install `ioredis` (preferred over the older `redis` package).

Create `src/config/redis.js` — export a Redis client with connection error handling and reconnect strategy.

### Use Case 1 — Movie Details Cache

Flow for `GET /movie/:imdbId`:

1. Check Redis first using `imdbId` as the key
2. If cache hit → return immediately (no DB, no OMDB call)
3. If cache miss → fetch from OMDB → save to DB → write to Redis with a TTL (24 hours is reasonable)

Movie data doesn't change often. This alone will dramatically reduce your external API calls and DB load.

### Use Case 2 — Refresh Token Blocklist

The problem: when a user logs out, you delete the cookie, but the JWT is still cryptographically valid until it expires.

Fix:
- On logout, store the access token (or its `jti` claim) in Redis with a TTL equal to its remaining expiry time
- In your auth middleware, after verifying the JWT signature, also check Redis to see if it's been blocklisted
- If found in Redis → reject with 401

This is how production systems implement stateless JWT invalidation.

---

## 5. Pagination — Add to All List Endpoints

Affected routes:
- `GET /watchlist`
- `GET /watchlist/search`
- `GET /movie/search`

### How to implement:
- Accept `page` and `limit` as query parameters
- Validate with Zod: default `page=1`, default `limit=10`, max `limit=50`
- In Prisma: use `skip` (calculated as `(page - 1) * limit`) and `take`
- Standardize your response shape:

```json
{
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

Also study how OMDB handles pagination on their end since you're proxying their search.

---

## 6. Centralized Error Handling

### asyncHandler Utility
- Create `src/utils/asyncHandler.js`
- Wraps async route handlers — catches errors and passes them to `next()`
- Eliminates repetitive try/catch in every controller

### ApiError Class
- Create `src/utils/ApiError.js`
- Extends native `Error`
- Accepts `statusCode`, `message`, and optional `errors` array
- Use this everywhere instead of raw `res.status(400).json(...)`

### ApiResponse Class
- Create `src/utils/ApiResponse.js`
- Standardizes all success responses
- Ensures consistent shape: `{ statusCode, data, message }`

### Global Error Handler Middleware
- Create `src/middlewares/errorHandler.js`
- Register it **last** in `app.js` (after all routes)
- Handles all error types in one place:
  - Prisma errors (unique constraint, not found, etc.)
  - Zod validation errors
  - JWT errors (expired, malformed)
  - Your custom ApiErrors
  - Unexpected/unknown errors

---

## 7. Environment & Config Validation

- Create `src/config/index.js`
- Read all env variables here and export as a config object
- Use **Zod** to validate env on startup

If `DATABASE_URL` is missing, the app should crash immediately with a clear error message — not fail silently on the first DB query.

### Files to have:
- `.env.development` — local dev values
- `.env.production` — production values (never committed)
- `.env.example` — committed to git, shows all required keys with placeholder values

---

## 8. Dev Experience Improvements

- Switch from `nodemon` to `tsx --watch` for TypeScript-native reloading (you already have `.ts` files)
- Add `"build"` and `"start"` scripts to `package.json` for production deployment
- Move `test-api.js`, `test-postman-api.js`, `test-routes.js` into a `scripts/` or `tests/` folder — they don't belong at the root

---

## Implementation Order

Tackle these in sequence — each one builds on the last:

| Step | Task | Why This Order |
|------|------|----------------|
| 1 | Restructure folders | You'll touch every file anyway — do it first |
| 2 | Centralize error handling + `asyncHandler` | Makes every subsequent step cleaner to write |
| 3 | Add helmet + compression + rate limiting | Pure middleware additions, no logic changes |
| 4 | Replace morgan with pino | Swap one middleware for another |
| 5 | Add pagination | Touches controllers + services, error handling must be in place |
| 6 | Add Redis (caching + token blocklist) | Requires config + middleware layers already set up |
| 7 | Validate env config with Zod on startup | Final hardening step |

---

## Packages to Install

```
# Production
helmet
express-rate-limit
compression
pino
pino-http
ioredis

# Dev only
pino-pretty
tsx
```

---

## Quick Checklist Before Going Live

- [ ] Folder structure follows module pattern
- [ ] Helmet mounted as first middleware
- [ ] Rate limiting on all routes + stricter limit on auth routes
- [ ] Compression enabled
- [ ] Pino logging in place (JSON in prod, pretty in dev)
- [ ] Redis connected with error handling
- [ ] Movie details cached in Redis with TTL
- [ ] Logout invalidates JWT via Redis blocklist
- [ ] All list endpoints paginated
- [ ] Global error handler catches all error types
- [ ] `asyncHandler` used in all controllers
- [ ] Env variables validated with Zod on startup
- [ ] `.env.example` committed to git
- [ ] Test files moved out of root
- [ ] `CORS_ORIGIN` is an env variable
- [ ] `JWT_SECRET` is a long random string (not "secret")
- [ ] `NODE_ENV=production` set in deployment environment

---

*Once all steps are complete, your backend will be genuinely production-ready — secure, observable, performant, and maintainable.*
