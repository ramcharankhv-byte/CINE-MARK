# CINE-MARK Backend - Folder Structure & File Analysis

## Complete Directory Structure

```
CINE-MARK/
├── .env                              # Environment variables (not in git)
├── .git/                             # Git repository
├── .gitignore                        # Git ignore rules
├── package.json                      # Project dependencies and scripts
├── package-lock.json                 # Exact dependency versions
├── prisma.config.ts                  # Prisma configuration (empty/reference)
│
├── node_modules/                     # Installed dependencies
│
├── prisma/                           # Database schema and migrations
│   ├── schema.prisma                 # Prisma data models
│   └── migrations/                   # Database migration history
│
├── src/                              # Main application code
│   ├── server.js                     # Server startup entry point
│   ├── app.js                        # Express app configuration
│   │
│   ├── config/                       # Configuration layer
│   │   ├── db.js                     # Prisma client initialization
│   │   ├── logger.js                 # Pino logger setup
│   │   ├── redis.js                  # Upstash Redis client
│   │   ├── security.js               # Helmet security configuration
│   │   └── swagger.js                # OpenAPI/Swagger documentation
│   │
│   ├── middleware/                   # Middleware functions
│   │   ├── rate-limiter.js           # Request rate limiting
│   │   ├── logger.middleware.js      # HTTP request logging
│   │   └── validator.js              # Zod validation wrapper
│   │
│   ├── modules/                      # Feature modules
│   │   ├── auth/                     # Authentication module
│   │   │   ├── auth.routes.js        # Auth endpoints
│   │   │   ├── auth.controller.js    # Auth request handlers
│   │   │   ├── auth.services.js      # Auth business logic
│   │   │   ├── auth.middleware.js    # JWT verification
│   │   │   └── auth.validator.js     # Auth validation schemas
│   │   │
│   │   ├── movie/                    # Movie search module
│   │   │   ├── movie.route.js        # Movie endpoints
│   │   │   ├── movie.controller.js   # Movie request handlers
│   │   │   ├── movie.services.js     # Movie business logic
│   │   │   └── movie.validator.js    # Movie validation schemas
│   │   │
│   │   └── watchlist/                # Watchlist management module
│   │       ├── watchlist.route.js    # Watchlist endpoints
│   │       ├── watchlist.controller.js
│   │       ├── watchlist.services.js
│   │       └── watchlist.validator.js
│   │
│   ├── utils/                        # Utility functions
│   │   ├── api-error.js              # Custom error class
│   │   ├── api-response.js           # Response formatter class
│   │   └── asynchandler.js           # Async error wrapper
│   │
│   ├── generated/                    # Generated files (Prisma, etc.)
│   ├── report/                       # Technical documentation (this file)
│   └── public/                       # Static files (if any)
│
├── test-api.js                       # API testing script
├── test-postman-api.js               # Postman API testing
└── test-routes.js                    # Route testing
```

---

## File-by-File Analysis

### Entry Points

#### **src/server.js**

**Purpose:** Application startup and shutdown management

**Responsibilities:**

- Load environment variables via dotenv
- Connect to database
- Start Express server
- Handle graceful shutdown
- Manage process errors

**Code Flow:**

```javascript
1. import app from "./app.js"
2. dotenv.config() - Load .env variables
3. connectDB() - Initialize Prisma connection
4. app.listen(port) - Start server
5. Error handlers:
   - process.on("unhandledRejection") - Catch async errors
   - process.on("uncaughtException") - Catch sync errors
   - process.on("SIGTERM") - Graceful shutdown on kill signal
```

**Dependencies:**

- `app.js` - Express configuration
- `config/db.js` - Database connection
- `config/logger.js` - Logging service
- `dotenv` - Environment variables

**Why Separate Entry Point:**

- Keeps app configuration separate from server startup
- Allows testing app without starting server
- Enables clustering/worker management in future

---

#### **src/app.js**

**Purpose:** Express application configuration and middleware setup

**Responsibilities:**

- Create Express app instance
- Register global middleware in execution order
- Mount route handlers
- Register global error handler

**Middleware Order (Critical):**

```javascript
1. app.use(express.json())              // Parse JSON body
2. app.use(express.urlencoded(...))     // Parse form data
3. app.use(express.static("public"))    // Serve static files
4. app.use(cookieParser())              // Parse cookies
5. app.use(secureHeaders)               // Helmet security headers
6. app.use(limiter)                     // Rate limiting
7. app.use(httpLogger)                  // Request logging
8. app.use(cors(...))                   // CORS handling
9. app.use("/api-docs", swagger)        // Swagger UI
10. app.use("/api/v1/*", routes)        // API routes
11. app.use(errorHandler)               // Global error middleware
```

**Why This Order:**

- Body parsers first: All middleware after needs parsed body
- Security next: Helmet before rate limiter ensures headers always set
- Rate limiter before logger: Can log rate limit responses
- Routes before error handler: Routes throw errors caught by handler
- Error handler last: Catches all errors from all middleware

**Key Code:**

```javascript
// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allow credentials/cookies
  }),
);

// Error Handler (catches ALL errors)
app.use((err, req, res, next) => {
  return res.status(err.statusCode || 500).json({
    success: err.success || false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
  });
});
```

**Return:** Express app instance exported for server.js

---

### Configuration Layer (src/config)

#### **config/db.js**

**Purpose:** Prisma ORM initialization and database connection

**Responsibilities:**

- Create Prisma client
- Connect to database
- Disconnect on shutdown
- Configure logging

**Code Breakdown:**

```javascript
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"] // Log everything in dev
      : ["error"], // Only errors in production
});

export const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info("DB Connected via Prisma");
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    process.exit(1); // Stop server if DB connection fails
  }
};

export const disconnectDB = async () => {
  await prisma.$disconnect(); // Graceful cleanup
};
```

**Why Separate File:**

- Singleton pattern: One Prisma client for entire app
- Reusable across all modules
- Centralized database configuration
- Easy to switch databases (just change URL in .env)

**Environment Variables Required:**

```
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=development|production
```

**Usage in Other Files:**

```javascript
import { prisma } from "../../config/db.js";

// All queries use same client instance
const user = await prisma.user.findUnique({ where: { id: userId } });
```

---

#### **config/logger.js**

**Purpose:** Centralized logging configuration

**Responsibilities:**

- Initialize Pino logger
- Configure output formatting (development vs production)
- Export logger for use throughout app

**Code:**

```javascript
import pino from "pino";

export const logger = pino({
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty", // Pretty-print logs in dev
          options: { colorize: true },
        }
      : undefined, // Plain JSON logs in production
});
```

**Benefits:**

- **Development:** Colored, readable logs for debugging
- **Production:** Structured JSON logs for log aggregation services
- **Performance:** Pino is extremely fast (asynchronous by default)
- **Compatibility:** Works with ELK, Datadog, CloudWatch, etc.

**Usage Pattern:**

```javascript
logger.info("Server running on PORT 5001");
logger.error("Database connection error:", error);
logger.warn("Rate limit exceeded for IP: 192.168.1.1");
```

---

#### **config/redis.js**

**Purpose:** Upstash Redis client initialization

**Responsibilities:**

- Initialize Redis client
- Configure connection
- Export for use in services

**Code:**

```javascript
import { Redis } from "@upstash/redis";

export const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
```

**Why Upstash:**

- REST-based API (no socket connection needed)
- Serverless-friendly (no persistent connections)
- Free tier sufficient for development
- Managed service (no setup required)

**Environment Variables Required:**

```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

**Usage in Services:**

```javascript
// Cache movie search for 1 hour
await redisClient.set(`search:${query}`, JSON.stringify(data), {
  EX: 3600,
});

// Retrieve cached data
const cachedData = await redisClient.get(cacheKey);
```

---

#### **config/security.js**

**Purpose:** Helmet security middleware configuration

**Responsibilities:**

- Set secure HTTP headers
- Prevent common web vulnerabilities
- Configure CSP, clickjacking protection, etc.

**Code:**

```javascript
export const secureHeaders = helmet({
  contentSecurityPolicy: false, // Disabled for flexibility
  crossOriginEmbedderPolicy: false, // Not needed for API
  hidePoweredBy: true, // Hide "X-Powered-By: Express"
  frameguard: { action: "deny" }, // Prevent clickjacking

  // HSTS only in production
  strictTransportSecurity:
    process.env.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,

  noSniff: true, // Prevent MIME sniffing
  ieNoOpen: true, // IE specific
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});
```

**Headers Set:**

- `X-Frame-Options: DENY` - Prevents embedding in iframes
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing attacks
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Strict-Transport-Security` - Forces HTTPS (production only)
- `Referrer-Policy` - Controls referrer information

**Threat Prevention:**

- Clickjacking: Frame-Options header
- MIME sniffing: Content-Type-Options header
- XSS: Referrer-Policy, CSP headers (if enabled)
- Man-in-the-middle: HSTS (production only)

---

#### **config/swagger.js**

**Purpose:** OpenAPI/Swagger documentation configuration

**Responsibilities:**

- Define API metadata
- Configure security schemes
- Reference route documentation
- Generate Swagger spec

**Code:**

```javascript
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CINE-MARK API",
      version: "1.0.0",
      description: "Movie Watchlist Backend API",
    },
    servers: [{ url: "http://localhost:8080" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/modules/**/*.routes.js"], // Scan route files for JSDoc comments
};

export const swaggerSpec = swaggerJsdoc(options);
```

**Usage in app.js:**

```javascript
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**Result:** Interactive API docs at `http://localhost:5001/api-docs`

---

### Middleware Layer (src/middleware)

#### **middleware/rate-limiter.js**

**Purpose:** Prevent abuse through rate limiting

**Responsibilities:**

- Limit requests per IP
- Return 429 on limit exceeded
- Track rate limit headers

**Code:**

```javascript
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100, // 100 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit headers
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
```

**Response Headers When Limited:**

```
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1642345000
```

**Attack Prevention:**

- Brute force attacks: Limits login attempts
- DDoS mitigation: Reduces impact of bulk requests
- API abuse: Prevents scraping/crawling

---

#### **middleware/logger.middleware.js**

**Purpose:** HTTP request/response logging

**Responsibilities:**

- Log every incoming request
- Log response status and timing
- Attach logger to request object

**Code:**

```javascript
import pinoHttp from "pino-http";

export const httpLogger = pinoHttp();
```

**Log Output Example:**

```json
{
  "level": 20,
  "time": "2024-01-15T10:30:00.123Z",
  "req": {
    "method": "POST",
    "url": "/api/v1/watchlist",
    "headers": { "content-type": "application/json" },
    "remoteAddress": "192.168.1.1"
  },
  "res": {
    "statusCode": 201,
    "responseTime": 45.23
  },
  "msg": "POST /api/v1/watchlist 201"
}
```

**Benefits:**

- Audit trail of all API calls
- Performance monitoring
- Security investigation
- Debug requests/responses

---

#### **middleware/validator.js**

**Purpose:** Input validation wrapper using Zod

**Responsibilities:**

- Validate request data against Zod schemas
- Extract validated data
- Return validation errors

**Code:**

```javascript
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      throw new ApiError(400, result.error.issues[0].message);
    }

    req.validatedData = result.data; // Attach validated data
    next(); // Proceed to controller
  };
};
```

**Usage in Routes:**

```javascript
movieRouter
  .route("/search")
  .get(validate(searchMovieSchema, "query"), searchMovie);
```

**Error Handling:**

```javascript
// Schema: z.object({ query: z.string().min(1) })
// Request: GET /api/v1/movie/search?query=
// Error: ApiError(400, "String must contain at least 1 character(s)")
```

---

### Utilities Layer (src/utils)

#### **utils/api-error.js**

**Purpose:** Custom error class for standardized errors

**Responsibilities:**

- Extend Error class
- Store status code
- Format error details

**Code:**

```javascript
class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
```

**Usage Examples:**

```javascript
throw new ApiError(400, "Invalid email");
throw new ApiError(401, "Unauthorized");
throw new ApiError(404, "User not found");
throw new ApiError(409, "User already exists");
throw new ApiError(500, "Database error");
```

**Benefits:**

- Consistent error format
- Easy to catch and format in error middleware
- Includes stack trace for debugging

---

#### **utils/api-response.js**

**Purpose:** Standard response format

**Responsibilities:**

- Format successful responses
- Include status code, data, message
- Calculate success boolean

**Code:**

```javascript
class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400; // Auto-calculate success
  }
}
```

**Usage:**

```javascript
return res.status(201).json(
  new ApiResponse(201, watchlist, "Watchlist created")
);

// Response sent:
{
  "statusCode": 201,
  "data": { id: "uuid", name: "My Watchlist", ... },
  "message": "Watchlist created",
  "success": true
}
```

---

#### **utils/asynchandler.js**

**Purpose:** Wrap async route handlers for error catching

**Responsibilities:**

- Catch async errors
- Pass errors to error middleware
- Eliminate repetitive try-catch blocks

**Code:**

```javascript
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
```

**Why Needed:**
Express doesn't catch errors inside async functions by default. Without this:

```javascript
// Without asyncHandler - ERROR NOT CAUGHT!
app.get("/route", async (req, res) => {
  throw new Error("Oops!"); // This won't trigger error middleware
});

// With asyncHandler - ERROR CAUGHT
app.get(
  "/route",
  asyncHandler(async (req, res) => {
    throw new Error("Oops!"); // This WILL trigger error middleware
  }),
);
```

---

### Module Layer (src/modules)

#### **modules/auth/auth.routes.js**

**Purpose:** Authentication endpoint definitions

**Responsibilities:**

- Define route paths
- Apply middleware per route
- Route to controller methods

**Code:**

```javascript
const authRouter = Router();

authRouter.post("/google/signup", googleSignup); // Public
authRouter.post("/google/login", googleLogin); // Public
authRouter.post("/refresh", refreshCookies); // Public (uses refresh token)
authRouter.post("/logout", verifyJwt, logout); // Protected

export default authRouter;
```

**Routes:**
| Method | Path | Auth Required | Description |
|--------|------|--------------|-------------|
| POST | `/api/v1/auth/google/signup` | No | Register new user with Google token |
| POST | `/api/v1/auth/google/login` | No | Login existing user with Google token |
| POST | `/api/v1/auth/refresh` | No | Refresh access token using refresh token |
| POST | `/api/v1/auth/logout` | Yes | Logout and invalidate refresh token |

**Middleware Applied:**

- `verifyJwt` on logout only (other routes are public)
- No validation middleware here (validation happens in controller)

---

#### **modules/auth/auth.controller.js**

**Purpose:** Handle authentication requests

**Responsibilities:**

- Extract data from requests
- Call services
- Format responses
- Handle errors

**Key Functions:**

**1. googleSignup(req, res)**

```javascript
export const googleSignup = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  // 1. Verify Google token
  const payload = await verifyGoogleToken(idToken);

  // 2. Check if user exists
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  // 3. Create user
  const newUser = await prisma.user.create({
    data: { googleId, email, name, picture },
  });

  // 4. Generate tokens
  const { accessToken, refreshToken } = generateAuthTokens(
    newUser.id,
    newUser.email,
  );

  // 5. Return response
  return res
    .status(201)
    .json(new ApiResponse(201, { user, accessToken, refreshToken }, "..."));
});
```

**2. googleLogin(req, res)**

- Verifies Google token
- Finds existing user by googleId
- Generates tokens
- Returns tokens in cookies
- Syncs profile updates from Google

**3. refreshCookies(req, res)**

- Retrieves refresh token from cookies/body
- Verifies token signature
- Checks token matches stored token (prevents replay attacks)
- Generates new tokens
- Returns new tokens in cookies

**4. logout(req, res)**

- Verifies JWT
- Clears refresh token from database
- Clears cookies on client
- Returns success message

---

#### **modules/auth/auth.services.js**

**Purpose:** Auth business logic and external API calls

**Responsibilities:**

- Generate JWT tokens
- Verify Google tokens
- Handle token expiration

**Key Functions:**

**generateAuthTokens(userId, email)**

```javascript
export const generateAuthTokens = (userId, email) => {
  const accessToken = jwt.sign(
    { id: userId, email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }, // Short-lived, high security
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }, // Long-lived, low security scope
  );

  return { accessToken, refreshToken };
};
```

**Why Two Tokens:**

- **Access Token (15m):** Used for API requests, if leaked only 15 min damage
- **Refresh Token (7d):** Used only to refresh access, stored securely, can be revoked

**verifyGoogleToken(idToken)**

```javascript
export const verifyGoogleToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    return payload; // Contains: sub (id), email, name, picture
  } catch (error) {
    throw new ApiError(401, "Invalid or expired Google token");
  }
};
```

---

#### **modules/auth/auth.middleware.js**

**Purpose:** Verify JWT and attach user to request

**Responsibilities:**

- Extract JWT from cookies or Authorization header
- Verify token signature
- Fetch user from database
- Attach user to request object

**Code:**

```javascript
export const verifyJwt = asyncHandler(async (req, res, next) => {
  // 1. Extract token from cookies or header
  const token =
    req.cookies?.accessToken ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    // 2. Verify token signature
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        googleId: true,
      },
    });

    if (!user) {
      throw new ApiError(400, "Invalid Token: Unauthorized");
    }

    // 4. Attach user to request
    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(400, "Invalid Token");
  }
});
```

**Why Query Database:**

- Ensures user still exists (not deleted)
- Can implement user deactivation by deleting token
- Enforces user existence check

**Error Cases:**

- No token: 401 Unauthorized
- Expired token: 401 Invalid Token
- Invalid signature: 401 Invalid Token
- User not found: 400 Invalid Token (security: don't reveal why)

---

#### **modules/auth/auth.validator.js**

**Purpose:** Input validation schemas for auth

**Code:**

```javascript
export const userIdSchema = z.uuid();
```

**Why Minimal:**

- Google signup/login uses Google token validation
- No schema needed (Google handles)
- Refresh uses standard JWT validation
- Logout uses JWT verification

---

#### **modules/movie/movie.route.js**

**Purpose:** Movie endpoint definitions

**Code:**

```javascript
const movieRouter = Router();

movieRouter.use(verifyJwt); // All movie routes require auth

movieRouter
  .route("/search")
  .get(validate(searchMovieSchema, "query"), searchMovie);

movieRouter
  .route("/:imdbID")
  .get(validate(movieParamsSchema, "params"), getMovie);

export default movieRouter;
```

**Routes:**
| Method | Path | Auth | Query/Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/api/v1/movie/search` | Yes | query, page | Search movies |
| GET | `/api/v1/movie/:imdbID` | Yes | imdbID | Get movie details |

---

#### **modules/movie/movie.controller.js**

**Purpose:** Handle movie requests

**Key Functions:**

**searchMovie(req, res)**

```javascript
export const searchMovie = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);

  // Call service (handles caching)
  const moviesList = await searchMoviesFromOMDB(query, page);

  if (moviesList.Response === "False") {
    throw new ApiError(404, "No movies found");
  }

  // Calculate pagination
  const totalResults = parseInt(moviesList.totalResults, 10) || 0;
  const limit = 10; // OMDb returns 10 per page
  const totalPages = Math.ceil(totalResults / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        movies: moviesList.Search,
        meta: {
          currentPage: page,
          limit,
          totalResults,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Movies fetched successfully",
    ),
  );
});
```

**getMovie(req, res)**

```javascript
export const getMovie = asyncHandler(async (req, res) => {
  const { imdbID } = req.params;

  // Check if movie exists in DB
  let movie = await findMovie(imdbID);

  // If not, fetch from OMDb and store
  if (!movie) {
    movie = await addMovie(imdbID);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, movie, "movie fetched successfully"));
});
```

---

#### **modules/movie/movie.services.js**

**Purpose:** Movie business logic and external API integration

**Responsibilities:**

- Call OMDb API
- Cache results in Redis
- Store movies in database

**Key Functions:**

**searchMoviesFromOMDB(query, page)**

```javascript
export async function searchMoviesFromOMDB(query, page = 1) {
  const cacheKey = `search:${query}`;

  // 1. Check Redis cache
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) {
    console.log("Cache Hit");
    return JSON.parse(cachedData);
  }

  console.log("Cache Miss");

  // 2. Fetch from OMDb API
  const apiUrl = `https://omdbapi.com/?apikey=${API_KEY}&s=${query}&page=${page}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new ApiError(404, "Could not fetch movie");
  }

  const data = await response.json();

  // 3. Cache result for 1 hour
  await redisClient.set(cacheKey, JSON.stringify(data), {
    EX: 3600,
  });

  return data;
}
```

**Cache Strategy:**

- **Key:** `search:{query}` (includes query string)
- **TTL:** 3600 seconds (1 hour)
- **Value:** Full OMDb API response
- **Hit Rate:** Very high for popular movies

**addMovie(imdbID)**

```javascript
export async function addMovie(imdbID) {
  // 1. Fetch from OMDb
  const apiUrl = `https://omdbapi.com/?apikey=${API_KEY}&i=${imdbID}`;
  const response = await fetch(apiUrl);
  const movieData = await response.json();

  // 2. Store in PostgreSQL
  const movie = await prisma.movie.create({
    data: {
      imdbID: movieData.imdbID,
      title: movieData.Title,
      year: movieData.Year,
      type: movieData.Type,
      cast: movieData.Actors,
      genre: movieData.Genre,
      director: movieData.Director,
      writer: movieData.Writer,
      plot: movieData.Plot,
      country: movieData.Country,
      poster: movieData.Poster,
      imdbRating: parseFloat(movieData.imdbRating) || null,
    },
  });

  return movie;
}
```

**findMovie(imdbID)**

```javascript
export const findMovie = async (imdbID) => {
  const cacheKey = `movie:${imdbID}`;

  // 1. Check Redis
  const cachedMovie = await redisClient.get(cacheKey);
  if (cachedMovie) return JSON.parse(cachedMovie);

  // 2. Check PostgreSQL
  const movie = await prisma.movie.findFirst({
    where: { imdbID },
  });

  // 3. Cache in Redis
  if (movie) {
    await redisClient.set(cacheKey, JSON.stringify(movie), { EX: 3600 });
  }

  return movie;
};
```

---

#### **modules/movie/movie.validator.js**

**Purpose:** Input validation for movie requests

**Code:**

```javascript
export const imdbIdSchema = z.regex(/^tt\d+$/); // Match tt1234567 format

export const searchMovieSchema = z.object({
  query: z.string().trim().min(1).max(100),
});

export const movieParamsSchema = z.object({
  imdbID: imdbIdSchema,
});
```

---

#### **modules/watchlist/** (Similar Structure)

**Purpose:** Watchlist CRUD and movie management

**Key Functions in watchlist.services.js:**

**createWatchlist(name, userId)**

```javascript
return prisma.watchlist.create({
  data: { name, userId, status: "PLAN_TO_WATCH" },
});
```

**addMovieToWatchlist(watchlistId, movieId, userId)**

```javascript
// 1. Verify watchlist exists and user owns it
// 2. Verify movie exists
// 3. Check movie not already in watchlist
// 4. Connect movie to watchlist via join table
await prisma.watchlist.update({
  where: { id: watchlistId },
  data: {
    movies: { connect: { id: movieId } },
  },
});
```

**getAllWatchlists(userId, page, limit)**

```javascript
// Fetch count and data in parallel
const [watchlists, totalItems] = await Promise.all([
  prisma.watchlist.findMany({
    where: { userId },
    skip: (page - 1) * limit,
    take: limit,
  }),
  prisma.watchlist.count({ where: { userId } }),
]);

return { watchlists, meta: { currentPage, limit, totalItems, totalPages } };
```

---

## Summary Table: Files & Responsibilities

| File                              | Lines | Purpose                        | Key Concept            |
| --------------------------------- | ----- | ------------------------------ | ---------------------- |
| server.js                         | 30    | App startup, graceful shutdown | Entry point            |
| app.js                            | 50    | Middleware setup, routing      | App configuration      |
| config/db.js                      | 20    | Prisma initialization          | Database connection    |
| config/logger.js                  | 15    | Pino setup                     | Structured logging     |
| config/redis.js                   | 10    | Redis client                   | Caching                |
| config/security.js                | 25    | Helmet config                  | HTTP headers           |
| config/swagger.js                 | 30    | API docs                       | OpenAPI                |
| middleware/rate-limiter.js        | 10    | Rate limiting                  | Abuse prevention       |
| middleware/logger.middleware.js   | 5     | HTTP logging                   | Request tracking       |
| middleware/validator.js           | 12    | Zod validation                 | Input validation       |
| utils/api-error.js                | 20    | Error class                    | Standardized errors    |
| utils/api-response.js             | 10    | Response class                 | Standardized responses |
| utils/asynchandler.js             | 10    | Error wrapper                  | Async error catching   |
| auth/auth.routes.js               | 15    | Auth endpoints                 | Routing                |
| auth/auth.controller.js           | 150   | Auth handlers                  | Request processing     |
| auth/auth.services.js             | 40    | Auth logic                     | Token generation       |
| auth/auth.middleware.js           | 30    | JWT verification               | Authentication         |
| movie/movie.controller.js         | 40    | Movie handlers                 | Request processing     |
| movie/movie.services.js           | 70    | Movie logic                    | API + caching          |
| watchlist/watchlist.controller.js | 80    | Watchlist handlers             | CRUD operations        |
| watchlist/watchlist.services.js   | 150   | Watchlist logic                | Business logic         |

---

## Dependency Graph

```
server.js
    ├── app.js
    │   ├── config/security.js (Helmet)
    │   ├── middleware/rate-limiter.js
    │   ├── middleware/logger.middleware.js
    │   │   └── config/logger.js (Pino)
    │   ├── config/cors setup
    │   ├── modules/auth/auth.routes.js
    │   │   ├── auth.controller.js
    │   │   │   ├── auth.services.js
    │   │   │   │   ├── config/db.js (Prisma)
    │   │   │   │   └── google-auth-library
    │   │   │   └── utils/api-response.js
    │   │   ├── auth.middleware.js
    │   │   │   ├── config/db.js
    │   │   │   └── jwt library
    │   │   └── middleware/validator.js
    │   ├── modules/movie/movie.route.js
    │   │   ├── movie.controller.js
    │   │   │   ├── movie.services.js
    │   │   │   │   ├── config/redis.js
    │   │   │   │   ├── fetch (native)
    │   │   │   │   └── config/db.js
    │   │   │   └── utils/api-response.js
    │   │   ├── auth.middleware.js (JWT)
    │   │   └── middleware/validator.js
    │   ├── modules/watchlist/watchlist.route.js
    │   │   ├── watchlist.controller.js
    │   │   │   ├── watchlist.services.js
    │   │   │   │   └── config/db.js
    │   │   │   └── utils/api-response.js
    │   │   ├── auth.middleware.js (JWT)
    │   │   └── middleware/validator.js
    │   └── Global error handler middleware
    ├── config/db.js
    │   └── config/logger.js
    └── process error handlers

prisma/schema.prisma
    └── Defines User, Movie, Watchlist models
```

---

## Key Takeaways

1. **Modular Design:** Each module is independent and follows standard MVC pattern
2. **DRY Principles:** Shared utilities reduce code duplication
3. **Security First:** Helmet, rate limiting, JWT on every layer
4. **Performance:** Redis caching, database indexing, query optimization
5. **Observability:** Comprehensive logging at multiple levels
6. **Error Handling:** Centralized, consistent error format
7. **Validation:** Input validation before business logic
8. **Scalability:** Can easily add new modules following same pattern

---

## Next Steps for Onboarding

1. Read 01-ARCHITECTURE-OVERVIEW.md for system design
2. Understand the file structure (this document)
3. Review database schema (03-DATABASE-SCHEMA.md)
4. Examine API routes (04-API-ROUTES.md)
5. Study authentication flows (05-SECURITY-ANALYSIS.md)
6. Test endpoints using Swagger UI at `/api-docs`
