# CINE-MARK Backend - Middleware & Error Handling

## Middleware Execution Order

### Complete Request Processing Chain

```
1. REQUEST ARRIVES AT NODEJS SERVER
   ↓
2. express.json() ── Parses JSON body
   ↓
3. express.urlencoded() ── Parses form data
   ↓
4. express.static() ── Serves static files (if matches)
   ├─ Matched? Return static file
   └─ Not matched? Continue...
   ↓
5. cookieParser() ── Parses cookies into req.cookies
   ↓
6. Helmet (secureHeaders) ── Sets security headers
   ├─ X-Frame-Options: DENY
   ├─ X-Content-Type-Options: nosniff
   ├─ Strict-Transport-Security (prod only)
   └─ ... (other headers)
   ↓
7. Rate Limiter ── Checks 100 requests / 15 min per IP
   ├─ Exceeded? Return 429 Too Many Requests
   └─ Within limit? Continue...
   ↓
8. Pino HTTP Logger ── Logs request details
   ├─ Method, path, headers, IP
   └─ Attaches timing info
   ↓
9. CORS ── Validates origin
   ├─ Origin not in allowedOrigins? Browser blocks response
   └─ Origin valid? Set CORS headers, continue...
   ↓
10. SWAGGER UI ── If path is /api-docs
    ├─ Matched? Serve Swagger UI
    └─ Not matched? Continue...
    ↓
11. ROUTE MATCHING ── Find matching route
    ├─ No match? Jump to global error handler
    ├─ Matched?
    │  ├─ Extract path params
    │  ├─ Parse query params
    │  └─ Continue...
    ↓
12. ROUTE-SPECIFIC MIDDLEWARE (if any)
    ├─ validate() middleware (Zod validation)
    │  ├─ Validation fails? throw ApiError(400)
    │  ├─ Success? Attach req.validatedData
    │  └─ next()
    ├─ verifyJwt middleware (JWT authentication)
    │  ├─ No token? throw ApiError(401)
    │  ├─ Invalid token? throw ApiError(400)
    │  ├─ Success? Attach req.user
    │  └─ next()
    ↓
13. CONTROLLER HANDLER
    ├─ Wrapped in asyncHandler
    ├─ Execute business logic
    ├─ Call services
    ├─ If error? Catch and pass to next()
    └─ If success? Send response
    ↓
14. RESPONSE SENT ── res.status().json()
    ├─ If controller error caught
    │  └─ Jump to global error handler
    ├─ If success response
    │  └─ Response sent to client
    ↓
15. GLOBAL ERROR HANDLER MIDDLEWARE
    ├─ app.use((err, req, res, next) => {...})
    ├─ Format error
    ├─ Send 400/401/404/500 response
    └─ End request
    ↓
16. REQUEST COMPLETE ── Response delivered to client
```

---

## Middleware Breakdown

### 1. Body Parser Middleware

**Code:**

```javascript
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

**Purpose:** Parse request body

**When It Executes:** FIRST (before any route handlers)

**What It Does:**

```javascript
// Input:
POST /api/v1/auth/google/signup
Content-Type: application/json
Body: { "idToken": "..." }

// Output:
req.body = { idToken: "..." }  // Parsed JSON
```

**Error Handling:**

```javascript
// Invalid JSON
{ idToken: "..." ] }  // Missing closing brace

// Result:
// express.json() throws SyntaxError
// Global error handler catches it
// Response: 400 Bad Request
```

---

### 2. Helmet Security Middleware

**Code:**

```javascript
app.use(secureHeaders); // From config/security.js
```

**Purpose:** Add HTTP security headers to EVERY response

**When It Executes:** SECOND (applies to all routes)

**Headers Added:**

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000 (prod only)
Referrer-Policy: strict-origin-when-cross-origin
```

**Attack Prevention:**

- Clickjacking: X-Frame-Options
- MIME sniffing: X-Content-Type-Options
- Man-in-the-middle: HSTS
- Referrer leakage: Referrer-Policy

---

### 3. Rate Limiter Middleware

**Code:**

```javascript
app.use(limiter); // From middleware/rate-limiter.js
```

**Purpose:** Prevent abuse through request limiting

**When It Executes:** THIRD (applies to all routes)

**Configuration:**

```javascript
{
  windowMs: 15 * 60 * 1000,  // 15 minute window
  max: 100,                   // 100 requests per window
  standardHeaders: true,      // Return RateLimit headers
  message: { ... }            // Custom error message
}
```

**How It Works:**

```javascript
// Tracks by IP address
// Stores count in memory

Request 1 from 192.168.1.1: ✓ (99 remaining)
Request 2 from 192.168.1.1: ✓ (98 remaining)
...
Request 100 from 192.168.1.1: ✓ (0 remaining)
Request 101 from 192.168.1.1: ✗ 429 Too Many Requests

// After 15 minutes: Counter resets
```

**Response When Limited:**

```
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1642345000

{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

---

### 4. HTTP Logger Middleware

**Code:**

```javascript
app.use(httpLogger); // pino-http
```

**Purpose:** Log HTTP request/response details

**When It Executes:** FOURTH (applies to all routes)

**Logged Information:**

```json
{
  "level": 20,
  "time": "2024-01-15T10:30:00.123Z",
  "req": {
    "method": "POST",
    "url": "/api/v1/watchlist",
    "headers": {
      "content-type": "application/json",
      "authorization": "Bearer ..."
    },
    "remoteAddress": "192.168.1.1"
  },
  "res": {
    "statusCode": 201,
    "responseTime": 45.23
  },
  "msg": "POST /api/v1/watchlist 201"
}
```

**Use Cases:**

- Audit trail of API calls
- Performance monitoring
- Security investigation
- Debugging

---

### 5. CORS Middleware

**Code:**

```javascript
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
```

**Purpose:** Control cross-origin requests

**When It Executes:** FIFTH (applies to all routes)

**How It Works:**

```javascript
// Request comes from frontend.example.com
GET /api/v1/movie/search

// If allowedOrigins = ["http://localhost:3000"]
// Response header set:
Access-Control-Allow-Origin: http://localhost:3000

// Browser checks:
// - Request origin: frontend.example.com
// - Response Allow-Origin: http://localhost:3000
// - Match? NO ✗
// - Browser blocks JavaScript access to response
// - Network tab shows error

// If request from http://localhost:3000
// Browser checks:
// - Request origin: http://localhost:3000
// - Response Allow-Origin: http://localhost:3000
// - Match? YES ✓
// - Browser allows response
```

---

### 6. Validator Middleware (Route-Specific)

**Code:**

```javascript
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      throw new ApiError(400, result.error.issues[0].message);
    }

    req.validatedData = result.data;
    next();
  };
};
```

**Usage in Routes:**

```javascript
movieRouter.get(
  "/search",
  validate(searchMovieSchema, "query"), // Validate query params
  searchMovie,
);
```

**Purpose:** Validate input before business logic

**When It Executes:** ROUTE-LEVEL (after global middleware)

**Example:**

```javascript
// Schema
const searchMovieSchema = z.object({
  query: z.string().trim().min(1).max(100)
});

// Request 1: Valid
GET /api/v1/movie/search?query=Inception
// result.success = true
// req.validatedData = { query: "Inception" }
// next() → proceed to controller

// Request 2: Invalid (empty string)
GET /api/v1/movie/search?query=
// result.success = false
// result.error.issues[0].message = "String must contain at least 1 character"
// throw ApiError(400, message)
// → Global error handler catches
// → Returns 400 response
```

**Validation Sources:**

```javascript
validate(schema, "body"); // req.body
validate(schema, "query"); // req.query
validate(schema, "params"); // req.params
```

---

### 7. Authentication Middleware (verifyJwt)

**Code:**

```javascript
export const verifyJwt = asyncHandler(async (req, res, next) => {
  // 1. Extract token
  const token =
    req.cookies?.accessToken ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) throw new ApiError(401, "Unauthorized");

  try {
    // 2. Verify signature & expiration
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Fetch user
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
    });

    if (!user) throw new ApiError(400, "Invalid Token");

    // 4. Attach user
    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(400, "Invalid Token");
  }
});
```

**Usage in Routes:**

```javascript
authRouter.post("/logout", verifyJwt, logout);
movieRouter.use(verifyJwt); // Apply to all movie routes
watchlistRouter.use(verifyJwt);
```

**Purpose:** Authenticate user before accessing protected resources

**When It Executes:** ROUTE-LEVEL (after validation)

**Execution Flow:**

```javascript
// Request:
GET /api/v1/movie/search
Authorization: Bearer eyJhbGc...

// Step 1: Extract
token = "eyJhbGc..."

// Step 2: Verify
decodedToken = jwt.verify(token, JWT_SECRET)
// If invalid/expired: throws TokenExpiredError
// Caught by catch block → ApiError(400)

// Step 3: Fetch User
user = await prisma.user.findUnique({
  where: { id: decodedToken.id }
})
// If user deleted: user = null
// If found: user = { id, email, name, ... }

// Step 4: Attach & Continue
req.user = user
next()  // Continue to controller
```

---

## Error Handling Flow

### AsyncHandler Wrapper

**Purpose:** Catch async errors and pass to error middleware

**Code:**

```javascript
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err)); // Pass error to middleware
  };
};
```

**Usage:**

```javascript
// Without asyncHandler (ERROR NOT CAUGHT)
app.get("/route", async (req, res) => {
  throw new Error("Oops!"); // Not caught by middleware
});

// With asyncHandler (ERROR CAUGHT)
app.get(
  "/route",
  asyncHandler(async (req, res) => {
    throw new Error("Oops!"); // Caught by middleware
  }),
);
```

**How It Works:**

```javascript
export const createWatchList = asyncHandler(async (req, res) => {
  // 1. If any await throws
  const watchlist = await watchlistService.createWatchlist(...);
  // 2. Error caught by Promise.catch()
  // 3. next(err) called with error
  // 4. Global error handler processes it
});
```

---

### Global Error Handler Middleware

**Code (in app.js):**

```javascript
app.use((err, req, res, next) => {
  return res.status(err.statusCode || 500).json({
    success: err.success || false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
  });
});
```

**Purpose:** Catch ALL errors from any middleware/route

**When It Executes:** LAST (catches everything)

**Error Detection:**

```javascript
// Errors caught from:
1. throw new ApiError(statusCode, message)
2. Validation failures
3. JWT verification failures
4. Database errors
5. External API errors
6. Unhandled Promise rejections
```

**Response Format:**

```javascript
// Error from controller
throw new ApiError(404, "Watchlist not found");

// Global handler catches
// Returns:
{
  statusCode: 404,
  success: false,
  message: "Watchlist not found",
  errors: []
}
```

---

## Error Types & Handling

### 1. Validation Errors

**Source:** Zod validation

**Example:**

```javascript
// Schema requires name
const schema = z.object({
  name: z.string().min(1).max(50)
});

// Request: { }
// Zod result:
{
  success: false,
  error: {
    issues: [
      { message: "Required" }
    ]
  }
}

// Caught by validator middleware
throw new ApiError(400, "Required");
```

**Response:**

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Required",
  "errors": []
}
```

---

### 2. Authentication Errors

**Source:** verifyJwt middleware

**Scenarios:**

| Scenario          | Error           | Status |
| ----------------- | --------------- | ------ |
| No token          | "Unauthorized"  | 401    |
| Expired token     | "Invalid Token" | 400    |
| Invalid signature | "Invalid Token" | 400    |
| User deleted      | "Invalid Token" | 400    |
| Malformed header  | "Invalid Token" | 400    |

**Responses:**

```json
// No token
{
  "statusCode": 401,
  "success": false,
  "message": "Unauthorized"
}

// Expired/invalid
{
  "statusCode": 400,
  "success": false,
  "message": "Invalid Token"
}
```

---

### 3. Business Logic Errors

**Source:** Services

**Examples:**

```javascript
// User not found
throw new ApiError(404, "User account not found");

// Already exists
throw new ApiError(409, "User already exists. Please login instead.");

// Not authorized
throw new ApiError(403, "Unauthorized");

// Invalid input
throw new ApiError(400, "Email permission is required");
```

---

### 4. External API Errors

**Source:** OMDb API calls

**Example:**

```javascript
const response = await fetch(omdbUrl);

if (!response.ok) {
  throw new ApiError(404, "Could not fetch movie");
}

const data = await response.json();

if (data.Response === "False") {
  throw new ApiError(404, movieData.Error);
}
```

---

### 5. Database Errors

**Handled by Prisma:**

```javascript
try {
  await prisma.user.create({ data: {...} });
} catch (error) {
  // Prisma throws specific errors
  if (error.code === "P2002") {
    // Unique constraint violation
    throw new ApiError(409, "Email already exists");
  }
}
```

---

## Error Flow Diagram

```
┌─ APPLICATION CODE
│  ├─ throw new ApiError(statusCode, message)
│  ├─ throw new Error("unexpected")
│  ├─ await asyncFunction (rejects)
│  └─ Validation fails
│
▼
┌─ CAUGHT BY
│  ├─ Try-catch (in service)
│  ├─ asyncHandler (in controller)
│  └─ Validator middleware
│
▼
└─ next(err)  OR  throw error
│
▼
┌─ GLOBAL ERROR HANDLER MIDDLEWARE
│  ├─ Receives err object
│  ├─ Extracts statusCode, message, errors
│  ├─ Formats response
│  └─ Sends res.status(code).json(formatted)
│
▼
RESPONSE SENT TO CLIENT
```

---

## Middleware Execution Summary Table

| Middleware     | Level  | Applies To       | Order | Purpose                 |
| -------------- | ------ | ---------------- | ----- | ----------------------- |
| express.json() | Global | All              | 1st   | Parse JSON body         |
| Helmet         | Global | All              | 2nd   | Security headers        |
| Rate Limiter   | Global | All              | 3rd   | Prevent abuse           |
| Logger         | Global | All              | 4th   | Log requests            |
| CORS           | Global | All              | 5th   | Cross-origin validation |
| Validator      | Route  | Per endpoint     | 6th   | Input validation        |
| verifyJwt      | Route  | Protected routes | 7th   | Authentication          |
| Controller     | Route  | Per endpoint     | 8th   | Business logic          |
| Error Handler  | Global | All errors       | Last  | Format errors           |

---

## Best Practices Applied

1. **Validation Before Logic**
   - Zod validates before service execution
   - Bad data rejected early

2. **Authentication Before Authorization**
   - verifyJwt runs before controller
   - User identity established first

3. **Error Standardization**
   - All errors use ApiError class
   - Consistent response format

4. **Async Error Handling**
   - asyncHandler wraps async functions
   - No try-catch needed in routes

5. **Security First**
   - Helmet runs early
   - Rate limiter prevents abuse
   - CORS validates origins

6. **Logging & Monitoring**
   - All requests logged
   - Response times tracked
   - Errors captured

---

## Testing Middleware

**Test Rate Limiter:**

```bash
for i in {1..105}; do
  curl http://localhost:5001/api/v1/movie/search?query=test
done
# After 100 requests: 429 Too Many Requests
```

**Test Authentication:**

```bash
# Without token
curl http://localhost:5001/api/v1/movie/search?query=test
# 401 Unauthorized

# With invalid token
curl -H "Authorization: Bearer invalid" http://localhost:5001/api/v1/movie/search?query=test
# 400 Invalid Token
```

**Test Validation:**

```bash
# Missing required param
curl http://localhost:5001/api/v1/movie/search
# 400 String must contain at least 1 character

# Invalid format
curl -X POST http://localhost:5001/api/v1/watchlist \
  -d '{"name":""}' \
  -H "Authorization: Bearer token"
# 400 String must contain at least 1 character
```
