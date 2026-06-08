# CINE-MARK Backend - Complete Workflow Guides

## Workflow 1: User Registration (Google Signup)

### Step-by-Step User Journey

**User Action:** Click "Sign Up with Google" button

### Backend Flow

```
REQUEST ARRIVES
│
├─ Route: POST /api/v1/auth/google/signup
├─ Body: { idToken: "..." }
│
▼
MIDDLEWARE CHAIN
│
├─ 1. Body Parser: Parses JSON
├─ 2. Helmet: Sets security headers
├─ 3. Rate Limiter: Checks 100/15min limit
├─ 4. Logger: Logs request
├─ 5. CORS: Validates origin
│
▼
ROUTE HANDLER: googleSignup(req, res)
│
├─ Step 1: Extract idToken from req.body
│   └─ if (!idToken) throw ApiError(400, "Token required")
│
├─ Step 2: Verify Google Token
│   └─ Call: verifyGoogleToken(idToken)
│      ├─ client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })
│      ├─ If invalid: throw ApiError(401, "Invalid token")
│      └─ Return payload: { sub, email, name, picture }
│
├─ Step 3: Check Email & GoogleId Uniqueness
│   └─ prisma.user.findFirst({
│        where: { OR: [{ googleId }, { email }] }
│      })
│      └─ if (exists) throw ApiError(409, "User exists")
│
├─ Step 4: Create User in Database
│   └─ prisma.user.create({
│        data: {
│          googleId: payload.sub,
│          email: payload.email,
│          name: payload.name,
│          picture: payload.picture
│        }
│      })
│      └─ Returns: { id, email, name, picture, ... }
│
├─ Step 5: Generate JWT Tokens
│   └─ generateAuthTokens(newUser.id, newUser.email)
│      ├─ accessToken = jwt.sign(
│      │    { id, email },
│      │    JWT_SECRET,
│      │    { expiresIn: "15m" }
│      │  )
│      └─ refreshToken = jwt.sign(
│           { id },
│           JWT_SECRET,
│           { expiresIn: "7d" }
│         )
│
├─ Step 6: Format Response
│   └─ new ApiResponse(201, {
│        user: { id, email, name, picture },
│        accessToken,
│        refreshToken
│      }, "User registered successfully")
│
▼
SEND RESPONSE
│
├─ Status: 201 Created
├─ Headers: Set appropriate security headers
├─ Body: { statusCode, data, message, success }
│
▼
FRONTEND RECEIVES
│
└─ Stores tokens and redirects to dashboard
```

### Database Changes

```sql
-- New row inserted into User table
INSERT INTO "User" (id, email, googleId, name, picture, "createdAt")
VALUES (
  'uuid-generated',
  'user@example.com',
  '118364307671776346543',
  'John Doe',
  'https://...',
  NOW()
);
```

### Error Scenarios

| Condition          | Status | Error Message                     |
| ------------------ | ------ | --------------------------------- |
| Missing idToken    | 400    | "Google ID Token is required"     |
| Invalid token      | 401    | "Invalid or expired Google token" |
| Email already used | 409    | "User already exists"             |
| Rate limited       | 429    | "Too many requests"               |

---

## Workflow 2: User Login (Google Login)

### Step-by-Step Flow

**User Action:** Click "Login with Google" button

### Backend Flow

```
REQUEST ARRIVES
│
├─ Route: POST /api/v1/auth/google/login
├─ Body: { idToken: "..." }
│
▼
MIDDLEWARE CHAIN (Same as signup)
│
▼
ROUTE HANDLER: googleLogin(req, res)
│
├─ Step 1: Verify Google Token
│   └─ verifyGoogleToken(idToken)
│      └─ Returns: { sub: googleId, ... }
│
├─ Step 2: Find Existing User by GoogleId
│   └─ prisma.user.findUnique({
│        where: { googleId: payload.sub }
│      })
│      └─ if (!user) throw ApiError(404, "Account not found")
│
├─ Step 3: Sync Profile Data (Name & Picture)
│   └─ prisma.user.update({
│        where: { googleId },
│        data: {
│          name: payload.name || user.name,
│          picture: payload.picture || user.picture,
│          refreshToken: newRefreshToken  // Update stored token
│        }
│      })
│
├─ Step 4: Generate Tokens
│   └─ generateAuthTokens(user.id, user.email)
│      └─ accessToken (15m) + refreshToken (7d)
│
├─ Step 5: Set HTTP-Only Cookies
│   └─ res.cookie("accessToken", token, {
│        httpOnly: true,
│        secure: isProduction,
│        sameSite: "lax",
│        maxAge: 900000
│      })
│      .cookie("refreshToken", token, {
│        httpOnly: true,
│        secure: isProduction,
│        sameSite: "lax",
│        maxAge: 604800000
│      })
│
├─ Step 6: Return User (Tokens in cookies, not body)
│   └─ new ApiResponse(200, { user }, "Logged in successfully")
│
▼
SEND RESPONSE
│
├─ Status: 200 OK
├─ Set-Cookie headers (tokens as HTTP-Only cookies)
├─ Body includes user info (but NOT tokens)
│
▼
FRONTEND RECEIVES
│
└─ Tokens automatically in browser cookies
└─ Subsequent requests automatically include cookies
```

### Key Difference from Signup

```
Signup Response:
{
  "data": {
    "user": {...},
    "accessToken": "...",    ◄─ Tokens in body
    "refreshToken": "..."
  }
}

Login Response:
{
  "data": {
    "user": {...}
  }
  // Tokens in Set-Cookie headers, NOT in body
}
```

---

## Workflow 3: Token Refresh

### When Token Expires

```
Client: Makes request with expired token
│
▼
Backend: jwt.verify() throws TokenExpiredError
│
▼
Frontend: Detects 401 response
│
▼
Frontend: Sends refresh request
POST /api/v1/auth/refresh
Cookie: refreshToken=<token>
│
▼
MIDDLEWARE CHAIN (Standard)
│
▼
ROUTE HANDLER: refreshCookies(req, res)
│
├─ Step 1: Extract Refresh Token
│   └─ From cookies or request body
│      └─ if (!token) throw ApiError(401, "Missing token")
│
├─ Step 2: Verify Signature & Expiration
│   └─ jwt.verify(token, JWT_SECRET)
│      └─ if (invalid/expired) throw ApiError(401, "Invalid token")
│
├─ Step 3: Fetch User from Database
│   └─ prisma.user.findUnique({ where: { id: decodedToken.id } })
│      └─ if (!user) throw ApiError(404, "User not found")
│
├─ Step 4: Verify Token Matches Stored Token (REPLAY ATTACK CHECK)
│   └─ if (incomingToken !== user.refreshToken)
│        throw ApiError(401, "Token already used")
│
├─ Step 5: Generate NEW Tokens
│   └─ accessToken (15m) + refreshToken (7d)
│      └─ NEW refreshToken different from old one
│
├─ Step 6: Update Database with New Refresh Token
│   └─ prisma.user.update({
│        where: { id },
│        data: { refreshToken: newRefreshToken }
│      })
│      └─ Old token now invalid (stored token changed)
│
├─ Step 7: Set New Cookies
│   └─ Set both new accessToken and refreshToken cookies
│
├─ Step 8: Return User
│   └─ new ApiResponse(200, { user }, "Cookies Refreshed")
│
▼
FRONTEND: Receives new tokens
│
└─ Automatically in cookies
└─ Can retry original request with new accessToken
```

### Why Replay Attack Protection Works

```
Scenario 1: Normal Refresh
  Browser has: refreshToken (old, value: "abc123")
  Sends: POST /refresh
  Server has: refreshToken (stored, value: "abc123")
  Check: "abc123" === "abc123" ✓ Pass
  Server generates: refreshToken (new, value: "def456")
  Server stores: "def456"
  Browser receives: new token in cookie

Scenario 2: Attacker Replays Old Token
  Attacker has: refreshToken (old, value: "abc123")
  Sends: POST /refresh with "abc123"
  Server has: refreshToken (stored, value: "def456") ✓ Changed!
  Check: "abc123" === "def456" ✗ Fail
  Server rejects: ApiError(401, "Token already used")
```

---

## Workflow 4: Logout

### User Action

**User clicks "Logout" button**

```
FRONTEND: Sends logout request
│
├─ POST /api/v1/auth/logout
├─ Header: Authorization: Bearer <accessToken>
├─ Cookie: refreshToken=<token>
│
▼
MIDDLEWARE CHAIN
│
├─ Authentication Middleware (verifyJwt)
│   ├─ Extract token from Authorization or Cookie
│   ├─ jwt.verify() validates signature/expiration
│   ├─ Query database for user
│   └─ Attach user to req.user
│
▼
ROUTE HANDLER: logout(req, res)
│
├─ Step 1: Get userId from req.user.id
│   └─ Provided by verifyJwt middleware
│
├─ Step 2: Query User
│   └─ prisma.user.findUnique({ where: { id: userId } })
│      └─ if (!user) throw ApiError(404, "User not found")
│
├─ Step 3: Invalidate Refresh Token
│   └─ prisma.user.update({
│        where: { id: userId },
│        data: { refreshToken: null }  ◄─ Set to NULL
│      })
│      └─ Stored token now invalid
│
├─ Step 4: Clear HTTP-Only Cookies
│   └─ res
│        .clearCookie("accessToken", { httpOnly: true, ... })
│        .clearCookie("refreshToken", { httpOnly: true, ... })
│      └─ Browser deletes cookies
│
├─ Step 5: Return Success
│   └─ new ApiResponse(200, null, "user logged out")
│
▼
FRONTEND: Receives success response
│
├─ Clears any state (localStorage, etc.)
├─ Redirects to login page
└─ Next request will fail (no tokens)
```

### Effect on Next Request

```
User tries to make request after logout:

GET /api/v1/movie/search

Case 1: Browser has old token in cookie
  ├─ Browser sends cookie
  ├─ verifyJwt validates JWT (still valid until expiry)
  ├─ Database check passes (user still exists)
  ├─ ✓ Request succeeds (token valid until expiry)
  └─ Note: Access token still valid for 15 min

Case 2: Browser tries to refresh with old refresh token
  ├─ POST /api/v1/auth/refresh
  ├─ Server extracts token from cookie
  ├─ jwt.verify() passes (not expired yet)
  ├─ Database check: user.refreshToken is NULL
  ├─ Check: incomingToken !== NULL ✗ Fails
  ├─ ✗ ApiError(401, "Token already used")
  └─ Cannot get new access token
```

---

## Workflow 5: Search Movies

### User Initiates Search

**User enters search query in frontend**

```
FRONTEND: User types "Inception"
│
▼
FRONTEND: Sends search request
│
├─ GET /api/v1/movie/search?query=Inception&page=1
├─ Header: Authorization: Bearer <accessToken>
├─ OR Cookie: accessToken=<token>
│
▼
MIDDLEWARE CHAIN
│
├─ Authentication (verifyJwt)
│   └─ Validates token, fetches user
│
├─ Validation (validate middleware)
│   ├─ Schema: z.object({ query: z.string().min(1).max(100) })
│   ├─ Validates req.query
│   ├─ if (invalid) throw ApiError(400, "Invalid query")
│   └─ Attaches req.validatedData = { query: "Inception" }
│
▼
ROUTE HANDLER: searchMovie(req, res)
│
├─ Step 1: Extract Parameters
│   ├─ query = req.query.query  (from validatedData or direct)
│   └─ page = Math.max(1, req.query.page || 1)
│
├─ Step 2: Call Service (searchMoviesFromOMDB)
│   └─ searchMoviesFromOMDB("Inception", 1)
│
▼
SERVICE LAYER: searchMoviesFromOMDB(query, page)
│
├─ Step 1: Check Redis Cache
│   ├─ cacheKey = "search:Inception"
│   ├─ cachedData = await redisClient.get(cacheKey)
│   ├─ if (cachedData)
│   │   ├─ console.log("Cache Hit")
│   │   └─ return JSON.parse(cachedData)
│   └─ Cache found? ✓ Return immediately (skip API call)
│
├─ Cache Miss? Continue:
│
├─ Step 2: Fetch from OMDb API
│   ├─ apiUrl = "https://omdbapi.com/?apikey=...&s=Inception&page=1"
│   ├─ response = await fetch(apiUrl)
│   ├─ if (!response.ok) throw ApiError(404, "API Error")
│   └─ data = await response.json()
│
├─ Step 3: Handle API Response
│   ├─ if (data.Response === "False")
│   │   └─ throw ApiError(404, "No movies found")
│   └─ data.Search contains array of movies
│
├─ Step 4: Cache Result
│   ├─ cacheKey = "search:Inception"
│   ├─ await redisClient.set(cacheKey, JSON.stringify(data), {
│   │    EX: 3600  ◄─ 1 hour expiry
│   │  })
│   └─ Future requests use cache
│
├─ Step 5: Return to Controller
│   └─ return data (contains Search array + totalResults)
│
▼
CONTROLLER: Process Results
│
├─ Step 1: Check Response
│   └─ if (moviesList.Response === "False")
│        throw ApiError(404, "No movies found")
│
├─ Step 2: Calculate Pagination
│   ├─ totalResults = parseInt(moviesList.totalResults)
│   ├─ limit = 10  (OMDb always returns 10 per page)
│   ├─ totalPages = Math.ceil(totalResults / 10)
│   ├─ hasNextPage = currentPage < totalPages
│   └─ hasPreviousPage = currentPage > 1
│
├─ Step 3: Format Response
│   └─ new ApiResponse(200, {
│        movies: moviesList.Search,
│        meta: {
│          currentPage: 1,
│          limit: 10,
│          totalResults: 83,
│          totalPages: 9,
│          hasNextPage: true,
│          hasPreviousPage: false
│        }
│      }, "Movies fetched successfully")
│
▼
FRONTEND: Receives response
│
├─ Status: 200 OK
├─ Data: 10 movies + pagination metadata
└─ Displays movies with pagination controls
```

### Cache Behavior Example

```
Request 1: GET /api/v1/movie/search?query=Inception&page=1
├─ Cache Miss
├─ Calls OMDb API: 300ms
├─ Stores in Redis
└─ Returns to frontend

Request 2: Same query (within 1 hour)
├─ Cache Hit
├─ Returns from Redis: 10ms
└─ Response identical

Request 3: Different query (query=Avatar)
├─ Cache Miss (different cache key: "search:Avatar")
├─ Calls OMDb API
└─ Stores new cache entry
```

---

## Workflow 6: Create Watchlist

### User Creates List

```
FRONTEND: User clicks "Create Watchlist"
│
▼
FRONTEND: Sends request
│
├─ POST /api/v1/watchlist
├─ Header: Authorization: Bearer <token>
├─ Body: { name: "My Favorites" }
│
▼
MIDDLEWARE CHAIN
│
├─ Authentication: verifyJwt validates token
├─ Validation: Validates { name: string, min(1), max(50) }
│
▼
CONTROLLER: createWatchList(req, res)
│
├─ Extract: name from req.body
├─ Extract: userId from req.user.id (from middleware)
│
├─ Call Service: watchlistService.createWatchlist(name, userId)
│
▼
SERVICE: createWatchlist(name, userId)
│
└─ prisma.watchlist.create({
     data: {
       name,
       userId,
       status: "PLAN_TO_WATCH"  ◄─ Default status
     }
   })
   └─ Returns: { id, name, userId, status, createdAt }
│
▼
CONTROLLER: Format Response
│
└─ new ApiResponse(201, watchlist, "Watchlist created")
│
▼
FRONTEND: Receives success
│
└─ Stores watchlist in state
└─ Displays in UI
```

### Database Changes

```sql
INSERT INTO "Watchlist" (id, name, userId, status, "createdAt")
VALUES (
  'uuid-1',
  'My Favorites',
  'user-uuid',
  'PLAN_TO_WATCH',
  NOW()
);

-- Constraint Check (UNIQUE on userId)
-- Only one watchlist per user allowed
```

---

## Workflow 7: Add Movie to Watchlist

### User Adds Movie

```
FRONTEND: User clicks "Add to Watchlist" on movie
│
▼
FRONTEND: Sends request
│
├─ POST /api/v1/watchlist/watchlist-uuid/movie-uuid
├─ Header: Authorization: Bearer <token>
│
▼
MIDDLEWARE CHAIN
│
├─ Authentication & Validation of path parameters (UUIDs)
│
▼
CONTROLLER: addMovieToWatchlist(req, res)
│
├─ Extract: watchlistId, movieId from params
├─ Extract: userId from req.user
│
├─ Call Service: addMovieToWatchlist(watchlistId, movieId, userId)
│
▼
SERVICE: addMovieToWatchlist(watchlistId, movieId, userId)
│
├─ Step 1: Fetch Watchlist
│   └─ prisma.watchlist.findUnique({
│        where: { id: watchlistId },
│        include: { movies: true }
│      })
│      └─ if (!watchlist) throw ApiError(404, "Not found")
│
├─ Step 2: Verify Ownership
│   └─ if (watchlist.userId !== userId)
│        throw ApiError(403, "Unauthorized")
│
├─ Step 3: Verify Movie Exists
│   └─ prisma.movie.findUnique({ where: { id: movieId } })
│      └─ if (!movie) throw ApiError(404, "Movie not found")
│
├─ Step 4: Check Movie Not Already Added
│   └─ const exists = watchlist.movies.some(m => m.id === movieId)
│      └─ if (exists) throw ApiError(400, "Already in watchlist")
│
├─ Step 5: Connect Movie to Watchlist
│   └─ prisma.watchlist.update({
│        where: { id: watchlistId },
│        data: {
│          movies: {
│            connect: { id: movieId }
│          }
│        }
│      })
│      └─ Inserts row in implicit _MovieToWatchlist join table
│
▼
CONTROLLER: Return Success
│
└─ new ApiResponse(200, null, "Movie added to watchlist")
│
▼
FRONTEND: Updates UI
│
└─ Shows "Added" confirmation
```

### Database Changes

```sql
-- Inserts into implicit join table
INSERT INTO "_MovieToWatchlist" (A, B)
VALUES ('movie-uuid', 'watchlist-uuid');

-- Creates many-to-many association
-- Now: watchlist contains this movie
```

---

## Workflow 8: Retrieve Watchlist with Movies

### User Views Watchlist

```
FRONTEND: User navigates to watchlist
│
▼
FRONTEND: Sends request
│
├─ GET /api/v1/watchlist/watchlist-uuid?page=1&limit=10
├─ Header: Authorization: Bearer <token>
│
▼
CONTROLLER: getWatchlist(req, res)
│
├─ Extract: page, limit from query (with defaults)
├─ Extract: watchlistId from params
├─ Extract: userId from req.user
│
├─ Call Service: getWatchlist(watchlistId, userId, page, limit)
│
▼
SERVICE: getWatchlist(watchlistId, userId, page, limit)
│
├─ Step 1: Calculate Offset
│   └─ offset = (page - 1) * limit
│
├─ Step 2: Fetch Watchlist + Movies (Paginated)
│   └─ prisma.watchlist.findUnique({
│        where: { id: watchlistId },
│        include: {
│          movies: {
│            skip: offset,
│            take: limit
│          }
│        }
│      })
│      └─ Returns only ONE page of movies
│
├─ Step 3: Verify Ownership
│   └─ if (watchlist.userId !== userId)
│        throw ApiError(403, "Unauthorized")
│
├─ Step 4: Count Total Movies
│   └─ prisma.movie.count({
│        where: { watchlistId: watchlistId }
│      })
│      └─ Total count for pagination
│
├─ Step 5: Calculate Meta
│   ├─ totalPages = Math.ceil(totalMovies / limit)
│   ├─ hasNextPage = page < totalPages
│   └─ hasPreviousPage = page > 1
│
├─ Step 6: Return Structured Response
│   └─ {
│        watchlistInfo: { id, name, createdAt },
│        movies: [ page of movies ],
│        meta: { pagination data }
│      }
│
▼
FRONTEND: Receives response
│
├─ Displays watchlist info
├─ Shows 10 movies
├─ Shows pagination controls
└─ User can navigate pages
```

---

## Workflow 9: Delete Watchlist

### User Deletes Watchlist

```
FRONTEND: User clicks "Delete Watchlist"
│
▼ Confirmation dialog
│
FRONTEND: Confirms deletion
│
▼
FRONTEND: Sends request
│
├─ DELETE /api/v1/watchlist/watchlist-uuid
├─ Header: Authorization: Bearer <token>
│
▼
MIDDLEWARE CHAIN: Validation & Authentication
│
▼
CONTROLLER: deleteWatchlist(req, res)
│
├─ Extract: watchlistId from params
├─ Extract: userId from req.user
│
├─ Call Service: deleteWatchlist(watchlistId, userId)
│
▼
SERVICE: deleteWatchlist(watchlistId, userId)
│
├─ Step 1: Fetch Watchlist
│   └─ prisma.watchlist.findUnique({ where: { id: watchlistId } })
│
├─ Step 2: Verify Ownership
│   └─ if (watchlist.userId !== userId)
│        throw ApiError(403, "Unauthorized")
│
├─ Step 3: Delete Watchlist
│   └─ prisma.watchlist.delete({
│        where: { id: watchlistId }
│      })
│      └─ Cascade: Removes all _MovieToWatchlist entries
│      └─ Movies NOT deleted (other users may have them)
│
▼
CONTROLLER: Return Success
│
└─ new ApiResponse(200, null, "Watchlist deleted")
│
▼
FRONTEND: Updates UI
│
└─ Removes watchlist from list
└─ Navigates away from deleted watchlist
```

### Database Changes

```sql
-- Delete from Watchlist table
DELETE FROM "Watchlist" WHERE id = 'watchlist-uuid';

-- Cascade delete from join table
DELETE FROM "_MovieToWatchlist" WHERE B = 'watchlist-uuid';

-- Movies table: NO CHANGE
-- (Movies can be in other watchlists or have no watchlist)
```

---

## Summary: Request Lifecycle for Protected Route

```
1. CLIENT REQUEST
   POST /api/v1/watchlist
   { name: "..." }
   Authorization: Bearer <token>

2. MIDDLEWARE EXECUTION
   ├─ Body Parser ✓
   ├─ Security ✓
   ├─ Rate Limiter ✓
   ├─ Logger ✓
   ├─ CORS ✓
   └─ Validator ✓

3. AUTHENTICATION
   └─ verifyJwt ✓ (req.user attached)

4. CONTROLLER
   └─ Extracts data, calls service

5. SERVICE
   └─ Business logic & database operations

6. DATABASE
   └─ INSERT/SELECT/UPDATE/DELETE

7. RESPONSE
   ├─ Format with ApiResponse
   ├─ Set status code
   ├─ Send JSON
   └─ Client receives
```
