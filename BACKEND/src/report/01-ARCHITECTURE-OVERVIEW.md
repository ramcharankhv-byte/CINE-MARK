# CINE-MARK Backend - Complete Technical Architecture Analysis

## Part 1: High-Level Architecture Overview

### System Design Overview

CINE-MARK is a production-grade REST API backend for a movie watchlist management system. It follows a **layered architecture pattern** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Web/Mobile)                       │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES / APIs                        │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Google OAuth    │  │  OMDb API       │                   │
│  │ (Authentication)│  │ (Movie Search)  │                   │
│  └─────────────────┘  └─────────────────┘                   │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│         Express.js Server (Layer: Request Processing)       │
│                   src/app.js                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Middleware Chain (Execution Order)                     │ │
│  │ 1. Body Parser (JSON/URL-encoded)                      │ │
│  │ 2. Static Files                                        │ │
│  │ 3. Cookie Parser                                       │ │
│  │ 4. Helmet Security Headers                             │ │
│  │ 5. Rate Limiter                                        │ │
│  │ 6. HTTP Logger (Pino)                                  │ │
│  │ 7. CORS                                                │ │
│  │ 8. Swagger Documentation                               │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│              ROUTE LAYER (src/modules)                       │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐   │
│  │  Auth Routes   │  │ Movie Routes   │  │ Watchlist    │   │
│  │ (public/jwt)   │  │ (jwt required) │  │ Routes       │   │
│  └────────────────┘  └────────────────┘  │ (jwt req)    │   │
│                                           └──────────────┘   │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│         MODULE LAYER (Each Module: auth, movie, watchlist)  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ For Each Module:                                     │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ 1. Validation Layer (.validator.js)           │   │   │
│  │ │    - Zod schema validation                     │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ 2. Authentication Layer (.middleware.js)      │   │   │
│  │ │    - JWT verification (auth module only)      │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ 3. Controller Layer (.controller.js)          │   │   │
│  │ │    - Request handler, input extraction        │   │   │
│  │ │    - Response formatting                      │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ 4. Service Layer (.services.js)               │   │   │
│  │ │    - Business logic                           │   │   │
│  │ │    - Database queries                         │   │   │
│  │ │    - External API calls                       │   │   │
│  │ │    - Caching logic                            │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│          DATA ACCESS LAYER (Prisma ORM)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Prisma Client (.config/db.js)                          │ │
│  │ - Manages all database operations                      │ │
│  │ - Query builder pattern                               │ │
│  │ - Type-safe queries                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│              DATABASE & CACHE LAYER                          │
│  ┌────────────────────┐  ┌────────────────────────────────┐ │
│  │ PostgreSQL (Neon)  │  │ Redis (Upstash)                │ │
│  │ - User Data        │  │ - Movie search cache (1hr)     │ │
│  │ - Movies           │  │ - Movie details cache (1hr)    │ │
│  │ - Watchlists       │  │ - Session data (optional)      │ │
│  └────────────────────┘  └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Major Modules & Responsibilities

#### 1. **Authentication Module** (`src/modules/auth`)

**Responsibility:** User registration, login, token management, logout

- Handles Google OAuth authentication
- Generates and validates JWT tokens
- Manages refresh token lifecycle
- Prevents token reuse attacks
- Provides token refresh mechanism

**Key Files:**

- `auth.routes.js` - API endpoints
- `auth.controller.js` - Request handlers
- `auth.services.js` - Token generation logic
- `auth.middleware.js` - JWT verification
- `auth.validator.js` - Input validation schemas

#### 2. **Movie Module** (`src/modules/movie`)

**Responsibility:** Movie search and retrieval with caching

- Searches movies via OMDb API
- Caches search results in Redis (1 hour TTL)
- Stores movie details in PostgreSQL
- Provides movie pagination
- Implements cache-aside pattern

**Key Files:**

- `movie.routes.js` - Public and protected endpoints
- `movie.controller.js` - Request handlers
- `movie.services.js` - API integration & caching
- `movie.validator.js` - Input validation

#### 3. **Watchlist Module** (`src/modules/watchlist`)

**Responsibility:** CRUD operations for watchlists and watchlist-movie relationships

- Create/Read/Update/Delete watchlists
- Manage many-to-many relationships between watchlists and movies
- Implements pagination for watchlist queries
- Supports watchlist search functionality
- Authorization checks on all operations

**Key Files:**

- `watchlist.routes.js` - All watchlist endpoints
- `watchlist.controller.js` - Request handlers
- `watchlist.services.js` - Business logic
- `watchlist.validator.js` - Input validation

#### 4. **Utilities Layer** (`src/utils`)

**Responsibility:** Shared utilities across all modules

- `api-error.js` - Custom error class with statusCode
- `api-response.js` - Standardized response formatting
- `asynchandler.js` - Wrapper for async error handling

#### 5. **Configuration Layer** (`src/config`)

**Responsibility:** Initialize and configure external services

- `db.js` - Prisma connection management
- `logger.js` - Pino logger setup
- `redis.js` - Upstash Redis client
- `security.js` - Helmet configuration
- `swagger.js` - OpenAPI documentation

#### 6. **Middleware Layer** (`src/middleware`)

**Responsibility:** Cross-cutting concerns

- `rate-limiter.js` - Request rate limiting (100 req / 15 min)
- `logger.middleware.js` - HTTP request logging
- `validator.js` - Zod schema validation wrapper

---

### Request Lifecycle (Complete Flow)

#### For a Protected Route (e.g., Create Watchlist)

```
1. CLIENT SENDS REQUEST
   POST /api/v1/watchlist
   Body: { name: "My Watchlist" }
   Headers: { Authorization: "Bearer <token>" }

2. EXPRESS SERVER RECEIVES
   ↓

3. BODY PARSER MIDDLEWARE
   - Parses JSON body
   - Stores in req.body
   ↓

4. HELMET SECURITY MIDDLEWARE
   - Sets security headers
   - Prevents XSS, clickjacking, etc.
   ↓

5. RATE LIMITER MIDDLEWARE
   - Checks if user exceeded rate limit (100 req/15min)
   - If exceeded: returns 429 Too Many Requests
   ↓

6. PINO HTTP LOGGER MIDDLEWARE
   - Logs incoming request details
   - Method, path, IP, user-agent
   ↓

7. CORS MIDDLEWARE
   - Validates origin against allowedOrigins
   ↓

8. ROUTER MATCHES ROUTE
   - /api/v1/watchlist POST matched
   ↓

9. VALIDATOR MIDDLEWARE (from route)
   - Calls validate(createPlaylistSchema, "body")
   - Schema: { name: string min(1) max(50) }
   - If validation fails: throws ApiError(400, message)
   ↓

10. ROUTER USES verifyJwt MIDDLEWARE
    - Extracts token from cookies OR Authorization header
    - Calls jwt.verify() with JWT_SECRET
    - If invalid: throws ApiError(401, "Invalid Token")
    - If valid: queries db for user
    - Stores user in req.user
    ↓

11. CONTROLLER FUNCTION EXECUTES
    - createWatchList(req, res)
    - Wrapped in asyncHandler
    - Calls req.validatedData (from validator)
    ↓

12. SERVICE LAYER EXECUTES
    - createWatchlist(name, userId)
    - Executes Prisma query:
      prisma.watchlist.create({
        data: { name, userId, status: "PLAN_TO_WATCH" }
      })
    ↓

13. PRISMA SENDS TO DATABASE
    - PostgreSQL receives INSERT query
    - Inserts new watchlist row
    - Returns created watchlist with id, createdAt, etc.
    ↓

14. SERVICE RETURNS TO CONTROLLER
    - watchlist object with all fields
    ↓

15. CONTROLLER CREATES RESPONSE
    - new ApiResponse(201, watchlist, "Watchlist created")
    - Returns res.status(201).json(...)
    ↓

16. RESPONSE SENT TO CLIENT
    {
      "statusCode": 201,
      "data": {
        "id": "uuid",
        "name": "My Watchlist",
        "userId": "uuid",
        "status": "PLAN_TO_WATCH",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      "message": "Watchlist created",
      "success": true
    }

17. ERROR HANDLING (If error occurs at any step)
    - asyncHandler catches the error via Promise.catch()
    - Calls next(err)
    - Global error middleware in app.js catches it:
      app.use((err, req, res, next) => {
        return res.status(err.statusCode || 500).json({
          success: err.success || false,
          message: err.message || "Internal Server Error",
          errors: err.errors || [],
        });
      })
```

---

### Technology Stack Rationale

| Component            | Technology            | Why Chosen                                                              |
| -------------------- | --------------------- | ----------------------------------------------------------------------- |
| **Framework**        | Express.js            | Lightweight, flexible, industry standard for Node.js REST APIs          |
| **Authentication**   | Google OAuth 2.0      | Reduces password management burden, OAuth industry standard             |
| **Token Management** | JWT (JSON Web Tokens) | Stateless, scalable, industry standard for API auth                     |
| **Database**         | PostgreSQL (Neon)     | Relational data fits watchlist use case, free tier, reliability         |
| **ORM**              | Prisma                | Type-safe queries, intuitive API, migrations, type generation           |
| **Caching**          | Redis (Upstash)       | In-memory store, fast retrieval, HTTP-based API suitable for serverless |
| **Validation**       | Zod                   | Runtime type checking, excellent error messages, TypeScript support     |
| **Security**         | Helmet                | Industry-standard Express security middleware, sets safe headers        |
| **Rate Limiting**    | express-rate-limit    | Simple to configure, prevents brute force attacks                       |
| **Logging**          | Pino                  | High-performance logging, structured logs, excellent for production     |
| **Documentation**    | Swagger/OpenAPI       | Standard API documentation, interactive testing                         |

---

### Key Architectural Principles Applied

1. **Separation of Concerns**
   - Routes handle only routing
   - Controllers handle only request/response
   - Services handle business logic
   - Middleware handles cross-cutting concerns

2. **DRY (Don't Repeat Yourself)**
   - AsyncHandler for consistent error handling
   - ApiError and ApiResponse for standardized formats
   - Validator middleware for all input validation

3. **Security by Default**
   - Helmet headers on every response
   - Rate limiting on all endpoints
   - JWT verification on protected routes
   - Input validation before business logic
   - Secure cookies (httpOnly, secure, sameSite)

4. **Performance Optimization**
   - Redis cache for expensive queries (OMDb API)
   - Prisma query parallelization (Promise.all)
   - Pagination for large datasets
   - Indexed database lookups

5. **Error Handling**
   - Centralized error middleware
   - Consistent error response format
   - Proper HTTP status codes
   - Stack traces in development

6. **Logging & Observability**
   - Request/response logging with Pino
   - Error logging with context
   - Database query logging in development

---

## Deliverable Summary

This document provides:

- ✅ Overall system design with layer breakdown
- ✅ Request lifecycle with complete flow
- ✅ Technology stack rationale
- ✅ Architectural principles
- ✅ Visual representations of data flow
