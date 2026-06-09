# CINE-MARK Backend - Complete API Route Documentation

## API Base URL

```
http://localhost:5001/api/v1
```

## Authentication Methods

All protected endpoints accept JWT tokens via:

1. **Authorization Header:** `Authorization: Bearer <token>`
2. **Cookie:** `accessToken=<token>` (HTTP-only cookie)

---

## Auth Endpoints

### 1. Google Signup

**Endpoint:** `POST /api/v1/auth/google/signup`

**Authentication:** None (Public)

**Purpose:** Register a new user with Google OAuth token

**Request:**

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.eyJhdWQiOiJjbGllbnRfaWQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTgzNjQzMDc2NzE3NzYzNDY1NDMiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJuYW1lIjoiSm9obiBEb2UiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2ExYi9hY0c4bXU4In0.signature"
}
```

**Validation:**

- `idToken` (string): Required
  - Must be valid Google OAuth token
  - Token verified against Google servers
  - Extracts: sub (googleId), email, name, picture

**Response (201 Created):**

```json
{
  "statusCode": 201,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "name": "John Doe",
      "picture": "https://lh3.googleusercontent.com/..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully with Google",
  "success": true
}
```

**Error Responses:**

| Status | Condition                | Message                                            |
| ------ | ------------------------ | -------------------------------------------------- |
| 400    | Missing idToken          | "Google ID Token is required"                      |
| 400    | Invalid token format     | "Invalid or expired Google token"                  |
| 400    | No email permission      | "Email permission is required from Google account" |
| 409    | User exists (same email) | "User already exists. Please login instead."       |

**Service Flow:**

1. Verify Google token with Google API
2. Extract payload (googleId, email, name, picture)
3. Check if user exists by googleId or email
4. If exists: reject (409)
5. Create user in PostgreSQL
6. Generate accessToken and refreshToken
7. Return user + tokens

**Technical Details:**

- Uses `google-auth-library` to verify token
- Compares against `GOOGLE_CLIENT_ID`
- Generates JWT tokens (15m and 7d expiry)
- Tokens sent in response body (NOT cookies)

---

### 2. Google Login

**Endpoint:** `POST /api/v1/auth/google/login`

**Authentication:** None (Public)

**Purpose:** Authenticate existing user with Google OAuth token

**Request:**

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.eyJhdWQiOiJjbGllbnRfaWQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTgzNjQzMDc2NzE3NzYzNDY1NDMiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20ifQ.signature"
}
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "name": "John Doe",
      "picture": "https://lh3.googleusercontent.com/..."
    }
  },
  "message": "Logged in successfully with Google",
  "success": true
}
```

**Response Headers:**

```
Set-Cookie: accessToken=<jwt>; HttpOnly; Path=/; Max-Age=900; Secure; SameSite=Lax
Set-Cookie: refreshToken=<jwt>; HttpOnly; Path=/; Max-Age=604800; Secure; SameSite=Lax
```

**Error Responses:**

| Status | Condition       | Message                                         |
| ------ | --------------- | ----------------------------------------------- |
| 400    | Missing idToken | "Google ID Token is required"                   |
| 401    | Invalid token   | "Invalid or expired Google token"               |
| 404    | User not found  | "Account does not exist. Please sign up first." |

**Service Flow:**

1. Verify Google token
2. Extract googleId
3. Find user by googleId in PostgreSQL
4. If not found: reject (404)
5. Sync profile (name, picture, refreshToken) with Google data
6. Generate new accessToken and refreshToken
7. Set HTTP-only cookies
8. Return user (no tokens in body)

**Security Features:**

- Tokens stored in HTTP-only cookies (inaccessible to JavaScript)
- Secure flag set (HTTPS only in production)
- SameSite=Lax (CSRF protection)
- Profile synced on every login (keeps data current)

---

### 3. Refresh Tokens

**Endpoint:** `POST /api/v1/auth/refresh`

**Authentication:** None (Public)

**Purpose:** Obtain new access token using refresh token

**Request Method 1: Cookie**

```
POST /api/v1/auth/refresh
Cookie: refreshToken=<token>
```

**Request Method 2: Body**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "name": "John Doe",
      "picture": "https://lh3.googleusercontent.com/..."
    }
  },
  "message": "cookies Refreshed",
  "success": true
}
```

**Response Headers:**

```
Set-Cookie: accessToken=<new_jwt>; HttpOnly; Path=/; Max-Age=900
Set-Cookie: refreshToken=<new_jwt>; HttpOnly; Path=/; Max-Age=604800
```

**Error Responses:**

| Status | Condition        | Message                                       |
| ------ | ---------------- | --------------------------------------------- |
| 401    | No refresh token | "Unauthorized request: Missing refresh token" |
| 401    | Expired token    | "Refresh token is invalid or expired"         |
| 401    | Reused token     | "Refresh token is expired or already used"    |
| 404    | User deleted     | "User account not found"                      |

**Service Flow:**

1. Extract refreshToken from cookies or body
2. Verify token signature with JWT_SECRET
3. Decode token to get userId
4. Query database for user
5. Compare incoming token with stored token (prevents replay attacks)
6. If not equal: reject (someone reused old token)
7. Generate new tokens
8. Update user's refreshToken in database
9. Set new cookies
10. Return user

**Replay Attack Prevention:**

```javascript
// Every refresh generates NEW refresh token
if (incomingRefreshToken !== user.refreshToken) {
  // Token was reused or invalidated
  throw new ApiError(401, "Refresh token is expired or already used");
}
```

---

### 4. Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Authentication:** Required (JWT)

**Purpose:** Invalidate user session and refresh token

**Request:**

```
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": null,
  "message": "user logged out",
  "success": true
}
```

**Response Headers:**

```
Set-Cookie: accessToken=; HttpOnly; Path=/; Max-Age=0
Set-Cookie: refreshToken=; HttpOnly; Path=/; Max-Age=0
```

**Error Responses:**

| Status | Condition      | Message                  |
| ------ | -------------- | ------------------------ |
| 401    | No token       | "Unauthorized"           |
| 400    | Invalid token  | "Invalid Token"          |
| 404    | User not found | "Account does not exist" |

**Service Flow:**

1. Verify JWT (verifyJwt middleware)
2. Extract userId from request object
3. Query database for user
4. Set refreshToken to NULL in database
5. Clear cookies on client (set Max-Age=0)
6. Return success

**Effect:**

- Refresh token invalidated (stored as NULL)
- Old access token still valid until expiry (can't check revocation without database)
- Next refresh attempt will fail (user can't get new tokens)

---

## Movie Endpoints

### 5. Search Movies

**Endpoint:** `GET /api/v1/movie/search?query=<term>&page=<num>`

**Authentication:** Required (JWT)

**Purpose:** Search movies from OMDb API with caching

**Query Parameters:**

| Parameter | Type   | Required | Default | Validation                |
| --------- | ------ | -------- | ------- | ------------------------- |
| `query`   | string | Yes      | N/A     | Min 1, Max 100 characters |
| `page`    | number | No       | 1       | Min 1, integer            |

**Example Requests:**

```
GET /api/v1/movie/search?query=Inception
GET /api/v1/movie/search?query=Inception&page=2
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "movies": [
      {
        "Title": "Inception",
        "Year": "2010",
        "imdbID": "tt1375666",
        "Type": "movie",
        "Poster": "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTUzXw@@._V1_SX300.jpg"
      },
      {
        "Title": "Inception: The Cobol Job",
        "Year": "2010",
        "imdbID": "tt1646971",
        "Type": "movie",
        "Poster": "N/A"
      }
    ],
    "meta": {
      "currentPage": 1,
      "limit": 10,
      "totalResults": 83,
      "totalPages": 9,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "message": "Movies fetched successfully",
  "success": true
}
```

**Error Responses:**

| Status | Condition     | Message                                       |
| ------ | ------------- | --------------------------------------------- |
| 401    | No auth token | "Unauthorized"                                |
| 400    | Invalid query | "String must contain at least 1 character(s)" |
| 404    | No results    | "No movies found"                             |

**Caching Behavior:**

- **Cache Key:** `search:{query}` (query string only)
- **TTL:** 1 hour (3600 seconds)
- **Cache Hit:** Returns immediately from Redis
- **Cache Miss:** Calls OMDb API, stores result

**Service Flow:**

1. Validate JWT (verifyJwt middleware)
2. Validate query parameter (validate middleware)
3. Check Redis cache for `search:{query}`
4. If cache hit: return cached data
5. If cache miss:
   - Call OMDb API: `https://omdbapi.com/?apikey=...&s={query}&page={page}`
   - Store response in Redis (1 hour)
   - Return data
6. Calculate pagination metadata
7. Return paginated response

**Pagination Note:**

- OMDb API returns max 10 results per page
- Metadata includes totalResults and totalPages
- Frontend can paginate through all results

---

### 6. Get Movie Details

**Endpoint:** `GET /api/v1/movie/:imdbID`

**Authentication:** Required (JWT)

**Purpose:** Get complete movie details (stored in database or fetched from OMDb)

**Path Parameters:**

| Parameter | Type   | Required | Validation                      |
| --------- | ------ | -------- | ------------------------------- |
| `imdbID`  | string | Yes      | Format: tt\d+ (e.g., tt1375666) |

**Example Request:**

```
GET /api/v1/movie/tt1375666
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "imdbID": "tt1375666",
    "title": "Inception",
    "year": "2010",
    "type": "movie",
    "cast": "Leonardo DiCaprio, Marion Cotillard, Ellen Page",
    "genre": "Action, Sci-Fi, Thriller",
    "director": "Christopher Nolan",
    "writer": "Christopher Nolan",
    "actors": "Leonardo DiCaprio, Marion Cotillard, Ellen Page",
    "plot": "A skilled thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    "country": "USA, UK",
    "poster": "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTUzXw@@._V1_SX300.jpg",
    "imdbRating": 8.8,
    "createdAt": "2024-01-10T08:00:00.000Z",
    "updatedAt": "2024-01-10T08:00:00.000Z"
  },
  "message": "movie fetched successfully",
  "success": true
}
```

**Error Responses:**

| Status | Condition                | Message                     |
| ------ | ------------------------ | --------------------------- |
| 401    | No auth token            | "Unauthorized"              |
| 400    | Invalid imdbID           | "String must match pattern" |
| 404    | Movie not found anywhere | Depends on OMDb API         |

**Service Flow:**

1. Validate JWT (verifyJwt middleware)
2. Validate imdbID format (validate middleware)
3. Check if movie exists in database
4. If found: Return from database + check Redis cache (refill if needed)
5. If not found:
   - Fetch from OMDb API: `https://omdbapi.com/?apikey=...&i={imdbID}`
   - Save to PostgreSQL database
   - Cache in Redis (1 hour)
   - Return data
6. Response includes full movie record

**Database Storage:**

- First time a movie is requested, it's stored in PostgreSQL
- Subsequent requests retrieve from database
- Redis cache used for quick access within 1 hour

**Caching Strategy:**

- **Cache Key:** `movie:{imdbID}`
- **TTL:** 1 hour
- **Hit:** Returns from Redis immediately
- **Miss:** Queries database or fetches from OMDb

---

## Watchlist Endpoints

### 7. Create Watchlist

**Endpoint:** `POST /api/v1/watchlist`

**Authentication:** Required (JWT)

**Purpose:** Create a new watchlist for the authenticated user

**Request Body:**

```json
{
  "name": "My Watchlist"
}
```

**Body Validation:**

- `name` (string): Required
  - Trimmed whitespace
  - Min 1, Max 50 characters

**Response (201 Created):**

```json
{
  "statusCode": 201,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "My Watchlist",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PLAN_TO_WATCH",
    "createdAt": "2024-01-15T10:35:00.000Z"
  },
  "message": "Watchlist created",
  "success": true
}
```

**Error Responses:**

| Status | Condition                  | Message                                       |
| ------ | -------------------------- | --------------------------------------------- |
| 401    | No auth token              | "Unauthorized"                                |
| 400    | Invalid name               | "String must contain at least 1 character(s)" |
| 409    | User already has watchlist | Constraint error                              |

**Service Flow:**

1. Verify JWT (verifyJwt middleware)
2. Validate request body (validate middleware)
3. Create watchlist in PostgreSQL:
   - name: from request
   - userId: from req.user.id
   - status: default "PLAN_TO_WATCH"
4. Return created watchlist

**Design Note:**

- One watchlist per user (unique constraint on userId)
- Attempting to create second watchlist will fail

---

### 8. Get All Watchlists

**Endpoint:** `GET /api/v1/watchlist?page=1&limit=10`

**Authentication:** Required (JWT)

**Purpose:** Retrieve all watchlists for authenticated user with pagination

**Query Parameters:**

| Parameter | Type   | Required | Default |
| --------- | ------ | -------- | ------- |
| `page`    | number | No       | 1       |
| `limit`   | number | No       | 10      |

**Example Requests:**

```
GET /api/v1/watchlist
GET /api/v1/watchlist?page=2&limit=20
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "watchlists": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "My Watchlist",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "PLAN_TO_WATCH",
        "createdAt": "2024-01-15T10:35:00.000Z"
      }
    ],
    "meta": {
      "currentPage": 1,
      "limit": 10,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "message": "Watchlists fetched successfully",
  "success": true
}
```

**Error Responses:**

| Status | Condition     | Message        |
| ------ | ------------- | -------------- |
| 401    | No auth token | "Unauthorized" |

**Service Flow:**

1. Verify JWT
2. Extract pagination parameters (default: page=1, limit=10)
3. Calculate offset: (page - 1) \* limit
4. Fetch watchlists in parallel:
   - Query watchlists with skip/take
   - Count total watchlists
5. Calculate pagination metadata
6. Return watchlists + metadata

**Optimization:**

- Uses Promise.all() for parallel queries
- Fetches only one page of data (not all)

---

### 9. Search Watchlists

**Endpoint:** `GET /api/v1/watchlist/search?query=<term>`

**Authentication:** Required (JWT)

**Purpose:** Search user's watchlists by name

**Query Parameters:**

| Parameter | Type   | Required | Validation                |
| --------- | ------ | -------- | ------------------------- |
| `query`   | string | Yes      | Min 1, Max 100 characters |

**Example Request:**

```
GET /api/v1/watchlist/search?query=action
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Action Movies",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "PLAN_TO_WATCH",
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "message": "Watchlists fetched successfully",
  "success": true
}
```

**Error Responses:**

| Status | Condition     | Message                                       |
| ------ | ------------- | --------------------------------------------- |
| 401    | No auth token | "Unauthorized"                                |
| 400    | Invalid query | "String must contain at least 1 character(s)" |

**Service Flow:**

1. Verify JWT
2. Validate query parameter
3. Search watchlists:
   ```javascript
   prisma.watchlist.findMany({
     where: {
       userId: req.user.id,
       name: { contains: query, mode: "insensitive" },
     },
   });
   ```
4. Return matching watchlists (no pagination)

**Database Query:**

- Case-insensitive search using PostgreSQL ILIKE operator
- Returns all matches (no limit)

---

### 10. Get Single Watchlist with Movies

**Endpoint:** `GET /api/v1/watchlist/:watchlistId?page=1&limit=10`

**Authentication:** Required (JWT)

**Purpose:** Retrieve a specific watchlist with paginated movies

**Path Parameters:**

| Parameter     | Type   | Required | Validation  |
| ------------- | ------ | -------- | ----------- |
| `watchlistId` | string | Yes      | UUID format |

**Query Parameters:**

| Parameter | Type   | Required | Default |
| --------- | ------ | -------- | ------- |
| `page`    | number | No       | 1       |
| `limit`   | number | No       | 10      |

**Example Request:**

```
GET /api/v1/watchlist/770e8400-e29b-41d4-a716-446655440002?page=1&limit=5
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "watchlistInfo": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "My Watchlist",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2024-01-15T10:35:00.000Z"
    },
    "movies": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "imdbID": "tt1375666",
        "title": "Inception",
        "year": "2010",
        "type": "movie",
        "poster": "https://...",
        "imdbRating": 8.8
      }
    ],
    "meta": {
      "currentPage": 1,
      "limit": 5,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "message": "Watchlist fetched successfully",
  "success": true
}
```

**Error Responses:**

| Status | Condition           | Message               |
| ------ | ------------------- | --------------------- |
| 401    | No auth token       | "Unauthorized"        |
| 403    | Not watchlist owner | "Unauthorized"        |
| 404    | Watchlist not found | "Watchlist not found" |

**Service Flow:**

1. Verify JWT
2. Validate watchlistId (UUID format)
3. Query watchlist with paginated movies:
   ```javascript
   prisma.watchlist.findUnique({
     where: { id: watchlistId },
     include: {
       movies: { skip, take }, // Pagination applied here
     },
   });
   ```
4. Check authorization (watchlist.userId === req.user.id)
5. Count total movies in watchlist
6. Calculate pagination metadata
7. Return separated watchlistInfo and movies arrays

**Security:**

- Verifies user owns the watchlist before returning

---

### 11. Add Movie to Watchlist

**Endpoint:** `POST /api/v1/watchlist/:watchlistId/:movieId`

**Authentication:** Required (JWT)

**Purpose:** Add a movie to a specific watchlist

**Path Parameters:**

| Parameter     | Type   | Required | Validation  |
| ------------- | ------ | -------- | ----------- |
| `watchlistId` | string | Yes      | UUID format |
| `movieId`     | string | Yes      | UUID format |

**Example Request:**

```
POST /api/v1/watchlist/770e8400-e29b-41d4-a716-446655440002/660e8400-e29b-41d4-a716-446655440001
```

**Request Body:** Empty

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": null,
  "message": "Movie added to watchlist",
  "success": true
}
```

**Error Responses:**

| Status | Condition                  | Message                      |
| ------ | -------------------------- | ---------------------------- |
| 401    | No auth token              | "Unauthorized"               |
| 403    | Not watchlist owner        | "Unauthorized"               |
| 404    | Watchlist not found        | "Watchlist not found"        |
| 404    | Movie not found            | "Movie not found"            |
| 400    | Movie already in watchlist | "Movie already in watchlist" |

**Service Flow:**

1. Verify JWT
2. Validate path parameters (UUIDs)
3. Fetch watchlist with all movies
4. Verify user owns watchlist
5. Verify movie exists
6. Check if movie already in watchlist
7. Connect movie to watchlist:
   ```javascript
   prisma.watchlist.update({
     where: { id: watchlistId },
     data: {
       movies: { connect: { id: movieId } },
     },
   });
   ```
8. Return success

**Database Operation:**

- Uses Prisma's many-to-many connect
- Inserts row into implicit \_MovieToWatchlist join table

---

### 12. Remove Movie from Watchlist

**Endpoint:** `DELETE /api/v1/watchlist/:watchlistId/:movieId`

**Authentication:** Required (JWT)

**Purpose:** Remove a movie from a specific watchlist

**Path Parameters:** Same as Add Movie

**Request Body:** Empty

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": null,
  "message": "Movie removed from watchlist",
  "success": true
}
```

**Error Responses:**

| Status | Condition              | Message                          |
| ------ | ---------------------- | -------------------------------- |
| 401    | No auth token          | "Unauthorized"                   |
| 403    | Not watchlist owner    | "Unauthorized"                   |
| 404    | Watchlist not found    | "Watchlist not found"            |
| 404    | Movie not found        | "Movie not found"                |
| 404    | Movie not in watchlist | "Movie not present in watchlist" |

**Service Flow:**

1. Verify JWT
2. Validate path parameters
3. Fetch watchlist with movies
4. Verify user owns watchlist
5. Verify movie exists
6. Verify movie is in watchlist
7. Disconnect movie from watchlist:
   ```javascript
   prisma.watchlist.update({
     where: { id: watchlistId },
     data: {
       movies: { disconnect: { id: movieId } },
     },
   });
   ```
8. Return success

---

### 13. Delete Watchlist

**Endpoint:** `DELETE /api/v1/watchlist/:watchlistId`

**Authentication:** Required (JWT)

**Purpose:** Delete a watchlist and remove all associations

**Path Parameters:**

| Parameter     | Type   | Required | Validation  |
| ------------- | ------ | -------- | ----------- |
| `watchlistId` | string | Yes      | UUID format |

**Example Request:**

```
DELETE /api/v1/watchlist/770e8400-e29b-41d4-a716-446655440002
```

**Request Body:** Empty

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": null,
  "message": "Watchlist deleted successfully",
  "success": true
}
```

**Error Responses:**

| Status | Condition           | Message               |
| ------ | ------------------- | --------------------- |
| 401    | No auth token       | "Unauthorized"        |
| 403    | Not watchlist owner | "Unauthorized"        |
| 404    | Watchlist not found | "Watchlist not found" |

**Service Flow:**

1. Verify JWT
2. Validate watchlistId
3. Fetch watchlist
4. Verify user owns watchlist
5. Delete watchlist:
   ```javascript
   prisma.watchlist.delete({
     where: { id: watchlistId },
   });
   ```
6. Return success

**Cascade Effects:**

- Watchlist deleted from PostgreSQL
- All rows in \_MovieToWatchlist join table removed
- Movies NOT deleted (other users may have them)

---

## API Response Format

### Success Response (2xx)

```json
{
  "statusCode": 200,
  "data": {
    /* response data */
  },
  "message": "Success message",
  "success": true
}
```

### Error Response (4xx, 5xx)

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Error message",
  "errors": ["Additional error details if validation"]
}
```

---

## Common Response Status Codes

| Code | Meaning                                       |
| ---- | --------------------------------------------- |
| 200  | Success - Request completed successfully      |
| 201  | Created - Resource created successfully       |
| 400  | Bad Request - Validation error, missing field |
| 401  | Unauthorized - No valid authentication        |
| 403  | Forbidden - Authenticated but not authorized  |
| 404  | Not Found - Resource doesn't exist            |
| 409  | Conflict - Duplicate resource                 |
| 429  | Too Many Requests - Rate limit exceeded       |
| 500  | Internal Error - Server error                 |

---

## Rate Limiting

All endpoints are rate limited:

**Limit:** 100 requests per 15 minutes per IP

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

## Authentication Header Formats

**Bearer Token:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Cookie:**

```
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Complete Endpoint Summary Table

| #   | Method | Endpoint                           | Auth | Purpose                |
| --- | ------ | ---------------------------------- | ---- | ---------------------- |
| 1   | POST   | `/auth/google/signup`              | No   | Register new user      |
| 2   | POST   | `/auth/google/login`               | No   | Authenticate user      |
| 3   | POST   | `/auth/refresh`                    | No   | Refresh access token   |
| 4   | POST   | `/auth/logout`                     | Yes  | Invalidate session     |
| 5   | GET    | `/movie/search`                    | Yes  | Search movies          |
| 6   | GET    | `/movie/:imdbID`                   | Yes  | Get movie details      |
| 7   | POST   | `/watchlist`                       | Yes  | Create watchlist       |
| 8   | GET    | `/watchlist`                       | Yes  | Get all watchlists     |
| 9   | GET    | `/watchlist/search`                | Yes  | Search watchlists      |
| 10  | GET    | `/watchlist/:watchlistId`          | Yes  | Get watchlist + movies |
| 11  | POST   | `/watchlist/:watchlistId/:movieId` | Yes  | Add movie to watchlist |
| 12  | DELETE | `/watchlist/:watchlistId/:movieId` | Yes  | Remove movie           |
| 13  | DELETE | `/watchlist/:watchlistId`          | Yes  | Delete watchlist       |

---

## Testing with cURL

**Signup:**

```bash
curl -X POST http://localhost:5001/api/v1/auth/google/signup \
  -H "Content-Type: application/json" \
  -d '{"idToken":"..."}'
```

**Search Movies:**

```bash
curl -X GET "http://localhost:5001/api/v1/movie/search?query=Inception" \
  -H "Authorization: Bearer <accessToken>"
```

**Create Watchlist:**

```bash
curl -X POST http://localhost:5001/api/v1/watchlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"name":"My Watchlist"}'
```

---

## Interactive API Documentation

Access Swagger UI at: `http://localhost:5001/api-docs`

Provides:

- Visual endpoint documentation
- Try-it-out feature for testing
- Request/response examples
- Automatic security scheme setup
