# CINE-MARK Backend - Security & Authentication Analysis

## Table of Contents

1. Authentication Architecture
2. JWT Token Management
3. Google OAuth Integration
4. Session Management
5. Security Middleware
6. Attack Prevention
7. Best Practices
8. Common Vulnerabilities & Mitigations

---

## 1. Authentication Architecture

### Overall Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Frontend)                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─── 1. Request Access Token ─────┐
                 │                                  │
    ┌────────────▼──────────────────────────────────┴─────┐
    │           AUTHENTICATION ENDPOINT                    │
    │   POST /api/v1/auth/google/signup                   │
    │   POST /api/v1/auth/google/login                    │
    └────────────┬──────────────────────────────────┬─────┘
                 │                                  │
                 ▼ 2. Verify Google Token           │
    ┌─────────────────────────────┐                │
    │   Google OAuth Servers      │                │
    │   (google-auth-library)     │                │
    └─────────────────────────────┘                │
                                                    │
              3. Generate JWT Tokens ◄──────────────┘
                 (JWT_SECRET)
                 ├─ Access Token (15m)
                 └─ Refresh Token (7d)
                 │
                 ▼ 4. Set HTTP-Only Cookies
    ┌──────────────────────────────┐
    │  Client Cookies (Secure)     │
    │  ├─ accessToken (HttpOnly)   │
    │  └─ refreshToken (HttpOnly)  │
    └──────────────────────────────┘
                 │
                 ▼ 5. Use Access Token in Requests
    ┌──────────────────────────────┐
    │  Protected Endpoint:         │
    │  GET /api/v1/movie/search    │
    │  Header: Authorization:...   │
    └────────────┬─────────────────┘
                 │
                 ▼ 6. Verify JWT in Middleware
    ┌──────────────────────────────┐
    │  verifyJwt Middleware        │
    │  ├─ Extract token            │
    │  ├─ Verify signature         │
    │  ├─ Check expiration         │
    │  └─ Fetch user from DB       │
    └────────────┬─────────────────┘
                 │ Valid Token
                 ▼ ◄─ Attach User to Request
    ┌──────────────────────────────┐
    │  Process Request             │
    │  req.user available          │
    └──────────────────────────────┘
```

---

## 2. JWT Token Management

### Access Token (15 minutes)

**Purpose:** Short-lived token for API access

**Payload:**

```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440000",    // User UUID
  email: "user@example.com",                      // User email
  iat: 1705318800,                                // Issued at
  exp: 1705319700                                 // Expires (900s later)
}
```

**Generation:**

```javascript
const accessToken = jwt.sign(
  { id: userId, email },
  process.env.JWT_SECRET,
  { expiresIn: "15m" }, // Must be environment variable
);
```

**Why 15 Minutes:**

- **Security:** If token leaked, limited damage window
- **Refresh Rate:** Users refresh every 15 minutes (transparent)
- **Database:** No need to check revocation list on every request
- **Performance:** Reduced database queries

**Verification:**

```javascript
const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
// Throws error if:
// - Signature invalid (wrong secret)
// - Token expired
// - Token malformed
```

---

### Refresh Token (7 days)

**Purpose:** Long-lived token to obtain new access tokens

**Payload:**

```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440000",    // User UUID only (no email)
  iat: 1705318800,
  exp: 1710502800                                 // Expires 7 days later
}
```

**Generation:**

```javascript
const refreshToken = jwt.sign(
  { id: userId }, // Only userId (minimal scope)
  process.env.JWT_SECRET,
  { expiresIn: "7d" },
);

// Store in database for verification
await prisma.user.update({
  where: { id: userId },
  data: { refreshToken },
});
```

**Why Different Scopes:**

- **Access Token:** Contains email (used for request processing)
- **Refresh Token:** Contains only id (minimal exposure)

**Why 7 Days:**

- **User Experience:** Don't force login for a week
- **Security:** Token replay attacks limited to 7 days
- **Balance:** Long enough for convenience, short enough for security

**Replay Attack Prevention:**

```javascript
// On refresh request, verify token matches stored token
if (incomingRefreshToken !== user.refreshToken) {
  throw new ApiError(401, "Refresh token is expired or already used");
}

// Every refresh generates NEW token (old one invalidated)
const newRefreshToken = jwt.sign(...);
await prisma.user.update({
  where: { id: userId },
  data: { refreshToken: newRefreshToken }  // Overwrite old token
});
```

---

### Token Storage & Security

**Access Token Storage:**

```javascript
// HTTP-Only Cookie (frontend cannot access)
res.cookie("accessToken", accessToken, {
  httpOnly: true, // JavaScript cannot read (XSS protection)
  secure: isProduction, // HTTPS only
  sameSite: "lax", // CSRF protection
  maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
});

// Also sent in response body (for headless clients)
```

**Refresh Token Storage:**

```javascript
// HTTP-Only Cookie (frontend cannot access)
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// NOT sent in response body (secure at rest in database)
```

**Storage Locations:**

```
Access Token:
├─ Browser Cookie (HTTP-Only)
├─ Response body JSON
└─ localStorage (if frontend chooses)

Refresh Token:
├─ Browser Cookie (HTTP-Only) ◄─ PRIMARY
├─ PostgreSQL database
└─ Never in response body
```

---

## 3. Google OAuth Integration

### Signup Flow (New User)

**Step-by-step:**

```
1. USER CLICKS "Sign Up with Google"
   ↓
2. GOOGLE LOGIN WINDOW OPENS
   - User enters Google credentials
   - Google verifies login
   ↓
3. GOOGLE GRANTS PERMISSION
   - User allows app to access:
     ✓ Email
     ✓ Name
     ✓ Profile picture
   ↓
4. FRONTEND RECEIVES idToken (JWT from Google)
   - Signed by Google private key
   - Contains: sub (googleId), email, name, picture
   ↓
5. FRONTEND SENDS TO BACKEND
   POST /api/v1/auth/google/signup
   Body: { idToken: "..." }
   ↓
6. BACKEND VERIFIES TOKEN
   const ticket = await client.verifyIdToken({
     idToken,
     audience: process.env.GOOGLE_CLIENT_ID
   });
   ↓
7. BACKEND EXTRACTS PAYLOAD
   const { sub: googleId, email, name, picture } = ticket.getPayload();
   ↓
8. BACKEND CHECKS IF USER EXISTS
   const existingUser = await prisma.user.findFirst({
     where: { OR: [{ googleId }, { email }] }
   });

   if (existingUser) {
     throw new ApiError(409, "User already exists");
   }
   ↓
9. BACKEND CREATES USER IN DATABASE
   const newUser = await prisma.user.create({
     data: { googleId, email, name, picture }
   });
   ↓
10. BACKEND GENERATES JWT TOKENS
    const { accessToken, refreshToken } = generateAuthTokens(
      newUser.id, newUser.email
    );
    ↓
11. BACKEND RETURNS TOKENS
    res.status(201).json({
      data: { user, accessToken, refreshToken }
    });
    ↓
12. FRONTEND STORES TOKENS
    - Save in browser cookies (if using cookies)
    - Or save in memory/state
    ↓
13. USER IS AUTHENTICATED
    - Can now make protected requests
    - Using accessToken in Authorization header
```

---

### Login Flow (Existing User)

```
1. USER CLICKS "Login with Google"
   ↓
2. GOOGLE VERIFICATION
   - Same as signup (Google OAuth flow)
   ↓
3. FRONTEND RECEIVES idToken
   ↓
4. FRONTEND SENDS TO BACKEND
   POST /api/v1/auth/google/login
   Body: { idToken: "..." }
   ↓
5. BACKEND VERIFIES TOKEN
   - Same as signup
   ↓
6. BACKEND EXTRACTS googleId
   const { sub: googleId } = payload;
   ↓
7. BACKEND FINDS EXISTING USER
   const user = await prisma.user.findUnique({
     where: { googleId }
   });

   if (!user) {
     throw new ApiError(404, "Account does not exist");
   }
   ↓
8. BACKEND SYNCS PROFILE DATA
   // Update name, picture if changed on Google
   const updatedUser = await prisma.user.update({
     where: { googleId },
     data: {
       name: payload.name || user.name,
       picture: payload.picture || user.picture,
       refreshToken  // Update stored token
     }
   });
   ↓
9. BACKEND GENERATES NEW TOKENS
   const { accessToken, refreshToken } = generateAuthTokens(
     user.id, user.email
   );
   ↓
10. BACKEND SETS HTTP-ONLY COOKIES
    res
      .cookie("accessToken", accessToken, { httpOnly: true, ... })
      .cookie("refreshToken", refreshToken, { httpOnly: true, ... })
    ↓
11. BACKEND RETURNS USER (NO TOKENS IN BODY)
    res.json({
      data: { user: { id, email, name, picture } },
      message: "Logged in successfully"
    });
    ↓
12. FRONTEND ACCESSES TOKENS FROM COOKIES
    // Browser automatically sends cookies with requests
    ↓
13. USER IS AUTHENTICATED
```

---

### Token Refresh Flow

```
1. ACCESS TOKEN EXPIRES (15 minutes)
   ↓
2. FRONTEND DETECTS EXPIRATION
   - JWT decode in frontend
   - Or catch 401 response
   ↓
3. FRONTEND SENDS REFRESH REQUEST
   POST /api/v1/auth/refresh
   Cookie: refreshToken=<token>
   // Or Body: { refreshToken: "..." }
   ↓
4. BACKEND EXTRACTS REFRESH TOKEN
   const incomingRefreshToken =
     req.cookies?.refreshToken || req.body.refreshToken;
   ↓
5. BACKEND VERIFIES SIGNATURE & EXPIRATION
   const decodedToken = jwt.verify(
     incomingRefreshToken,
     process.env.JWT_SECRET
   );

   If invalid/expired:
     throw new ApiError(401, "Refresh token is invalid or expired");
   ↓
6. BACKEND FETCHES USER FROM DATABASE
   const user = await prisma.user.findUnique({
     where: { id: decodedToken.id }
   });

   if (!user) {
     throw new ApiError(404, "User account not found");
   }
   ↓
7. BACKEND VERIFIES STORED TOKEN MATCHES
   if (incomingRefreshToken !== user.refreshToken) {
     throw new ApiError(401, "Refresh token already used");
   }

   // Prevents replay attacks
   ↓
8. BACKEND GENERATES NEW TOKENS
   const newAccessToken = jwt.sign(
     { id, email },
     JWT_SECRET,
     { expiresIn: "15m" }
   );

   const newRefreshToken = jwt.sign(
     { id },
     JWT_SECRET,
     { expiresIn: "7d" }
   );
   ↓
9. BACKEND STORES NEW REFRESH TOKEN
   await prisma.user.update({
     where: { id },
     data: { refreshToken: newRefreshToken }
   });
   ↓
10. BACKEND SETS NEW COOKIES
    res
      .cookie("accessToken", newAccessToken, {
        httpOnly: true, maxAge: 900000, ...
      })
      .cookie("refreshToken", newRefreshToken, {
        httpOnly: true, maxAge: 604800000, ...
      })
    ↓
11. FRONTEND RECEIVES NEW TOKENS
    - Automatically in cookies
    - Optional in response body
    ↓
12. NEXT REQUEST USES NEW ACCESS TOKEN
    - Transparent to user
    - No re-authentication needed
```

---

### Logout Flow

```
1. USER CLICKS "Logout"
   ↓
2. FRONTEND SENDS LOGOUT REQUEST
   POST /api/v1/auth/logout
   Header: Authorization: Bearer <accessToken>
   Cookie: refreshToken=<token>
   ↓
3. BACKEND VERIFIES JWT
   const decodedToken = jwt.verify(accessToken, JWT_SECRET);
   const user = await prisma.user.findUnique({...});
   ↓
4. BACKEND INVALIDATES REFRESH TOKEN
   await prisma.user.update({
     where: { id: userId },
     data: { refreshToken: null }  // Invalidate
   });

   // Now token stored in DB doesn't match browser cookie
   ↓
5. BACKEND CLEARS HTTP-ONLY COOKIES
   res
     .clearCookie("accessToken", { httpOnly: true, ... })
     .clearCookie("refreshToken", { httpOnly: true, ... })
   ↓
6. BACKEND RETURNS SUCCESS
   res.json({
     statusCode: 200,
     message: "user logged out",
     success: true
   });
   ↓
7. FRONTEND CLEARS STATE (if storing tokens)
   - Remove from localStorage
   - Remove from session storage
   - Reset user context
   ↓
8. NEXT REFRESH REQUEST FAILS
   POST /api/v1/auth/refresh

   Backend checks:
   if (incomingRefreshToken !== user.refreshToken)  // null !== cookie
     throw new ApiError(401, "Refresh token already used");
   ↓
9. USER MUST LOGIN AGAIN
```

---

## 4. Session Management

### Session Validation in verifyJwt Middleware

```javascript
export const verifyJwt = asyncHandler(async (req, res, next) => {
  // 1. EXTRACT TOKEN
  const token =
    req.cookies?.accessToken ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    // 2. VERIFY SIGNATURE & EXPIRATION
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // 3. VERIFY USER STILL EXISTS
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

    // 4. ATTACH USER TO REQUEST
    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(400, "Invalid Token");
  }
});
```

**Security Checks:**

1. ✓ Token format valid
2. ✓ Signature matches JWT_SECRET
3. ✓ Token not expired
4. ✓ User still exists in database (not deleted)

**Why Query Database:**

- Ensures user account still exists
- Allows immediate invalidation (delete user = invalidate session)
- Can check user status (banned, suspended) in future

**Error Scenarios:**

```
Scenario 1: No token
  → ApiError(401, "Unauthorized")

Scenario 2: Expired token (> 15 minutes old)
  → jwt.verify() throws
  → ApiError(400, "Invalid Token")

Scenario 3: Invalid signature (tampered token)
  → jwt.verify() throws
  → ApiError(400, "Invalid Token")

Scenario 4: User deleted
  → prisma.user.findUnique() returns null
  → ApiError(400, "Invalid Token: Unauthorized")
```

---

## 5. Security Middleware

### Helmet Security Headers

**Configuration:**

```javascript
export const secureHeaders = helmet({
  contentSecurityPolicy: false, // Disabled for flexibility
  crossOriginEmbedderPolicy: false, // Not needed for API
  hidePoweredBy: true, // Hide server info
  frameguard: { action: "deny" }, // Prevent clickjacking

  strictTransportSecurity:
    process.env.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,

  noSniff: true, // Prevent MIME sniffing
  ieNoOpen: true, // IE protection
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});
```

**Headers Set on Every Response:**

| Header                      | Value                           | Purpose                                      |
| --------------------------- | ------------------------------- | -------------------------------------------- |
| `X-Frame-Options`           | DENY                            | Prevents embedding in iframes (clickjacking) |
| `X-Content-Type-Options`    | nosniff                         | Prevents MIME type sniffing                  |
| `X-XSS-Protection`          | 1; mode=block                   | Legacy XSS protection                        |
| `Strict-Transport-Security` | max-age=31536000; ...           | Force HTTPS for 1 year                       |
| `Referrer-Policy`           | strict-origin-when-cross-origin | Control referrer info leakage                |

**Attack Prevention:**

1. **Clickjacking (X-Frame-Options: DENY)**

   ```html
   <!-- Attack attempt: Embedding app in invisible iframe -->
   <iframe src="https://cine-mark.com/api/v1/logout"></iframe>

   <!-- Response header prevents framing -->
   <!-- Browser refuses to display in iframe -->
   ```

2. **MIME Sniffing (X-Content-Type-Options: nosniff)**

   ```
   Attack: Upload SVG with embedded JavaScript
   - Without header: Browser executes as JS
   - With header: Browser respects content-type
   ```

3. **Man-in-the-Middle (HSTS)**
   ```
   Attack: Intercept HTTP traffic (unencrypted)
   - With HSTS: Browser forces HTTPS
   - Impossible to intercept TLS traffic
   ```

---

### Rate Limiter Middleware

**Configuration:**

```javascript
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100, // 100 requests per window
  standardHeaders: true, // Return RateLimit headers
  legacyHeaders: false, // Disable old format
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
```

**Attack Prevention:**

1. **Brute Force Attacks**

   ```
   Attacker tries 1000 login attempts per second
   Rate limiter: Max 100 requests per 15 minutes
   Result: Attacker blocked after ~6 seconds (100 requests)
   ```

2. **DDoS Mitigation**

   ```
   Attacker sends millions of requests
   Rate limiter: Rejects excess requests
   Result: Reduces impact (not complete prevention)
   ```

3. **API Scraping**
   ```
   Attacker crawls movie database
   Rate limiter: Enforces reasonable limit
   Result: Scraping takes impractical time
   ```

**Response Headers:**

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1642345000
```

**Client Handling:**

```javascript
// Frontend should:
// 1. Check RateLimit headers
// 2. If Remaining < 10, show warning
// 3. On 429: Retry after RateLimit-Reset
```

---

## 6. Attack Prevention

### Cross-Origin Resource Sharing (CORS)

**Configuration:**

```javascript
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins, // Only these domains can access
    credentials: true, // Allow cookies/auth headers
  }),
);
```

**Attack Prevention:**

```
Scenario: Attacker's website makes request to API
  https://attacker.com → https://api.cine-mark.com

Without CORS:
  ✗ Browser allows cross-origin request
  ✗ Attacker's page can steal user data

With CORS + allowedOrigins:
  ✓ Browser checks response header
  ✓ Access-Control-Allow-Origin: https://cine-mark.com
  ✓ Doesn't match https://attacker.com
  ✓ Browser blocks response
  ✓ Attacker's JavaScript cannot read data
```

---

### SQL Injection Prevention

**Vulnerability Without ORM:**

```javascript
// ❌ VULNERABLE CODE
const email = req.body.email;
const query = `SELECT * FROM users WHERE email = '${email}'`;
// If email = "'; DROP TABLE users; --"
// Query becomes: SELECT * FROM users WHERE email = ''; DROP TABLE users; --'
```

**Prevention With Prisma:**

```javascript
// ✅ SAFE CODE
const user = await prisma.user.findUnique({
  where: { email: req.body.email },
});
// Prisma:
// 1. Separates query from data
// 2. Escapes special characters
// 3. Prevents injection
```

---

### Cross-Site Scripting (XSS)

**Protection Strategy:**

1. **HTTP-Only Cookies**

   ```javascript
   res.cookie("accessToken", token, {
     httpOnly: true, // JavaScript cannot access
   });

   // Attacker's script CANNOT steal token
   // const token = document.cookie;  // Returns empty
   ```

2. **Input Validation**

   ```javascript
   // All inputs validated with Zod before use
   export const createPlaylistSchema = z.object({
     name: z.string().trim().min(1).max(50),
   });

   // Prevents script injection in watchlist names
   // name: "<script>alert('XSS')</script>" → Rejected
   ```

3. **Content Type Headers**

   ```javascript
   res.setHeader("Content-Type", "application/json");
   res.setHeader("X-Content-Type-Options", "nosniff");

   // Browser treats response as JSON, not HTML
   // Prevents script execution
   ```

---

### Cross-Site Request Forgery (CSRF)

**Protection Strategy:**

1. **SameSite Cookies**

   ```javascript
   res.cookie("accessToken", token, {
     sameSite: "lax", // Only sent on same-site requests
   });

   // Attack scenario prevented:
   // User logged into api.cine-mark.com
   // User visits attacker.com
   // Attacker's page: <img src="api.cine-mark.com/logout">
   // Result: Cookie NOT sent (different site)
   // Logout doesn't happen
   ```

2. **Stateless JWT**

   ```
   CSRF tokens require server-side session store
   JWTs are stateless (token includes everything)
   No session store = No CSRF token needed

   SameSite cookie alone is sufficient
   ```

---

## 7. Best Practices

### 1. Secure Cookie Configuration

**Production Settings:**

```javascript
const options = {
  httpOnly: true, // JavaScript cannot access
  secure: true, // HTTPS only (prevents man-in-the-middle)
  sameSite: "strict", // CSRF protection (strict mode)
  maxAge: 900000, // 15 minutes
  path: "/", // Available at all paths
};

res.cookie("accessToken", token, options);
```

**Development Settings (for localhost):**

```javascript
const options = {
  httpOnly: true,
  secure: false, // HTTP allowed (localhost)
  sameSite: "lax", // Relaxed for testing
  maxAge: 900000,
  path: "/",
};
```

---

### 2. Environment Variable Management

**Never Store Secrets in Code:**

```javascript
// ❌ BAD
const JWT_SECRET = "super-secret-key-12345";

// ✅ GOOD
const JWT_SECRET = process.env.JWT_SECRET;

// ✅ BEST (with validation)
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
```

**Required Environment Variables:**

```bash
# Authentication
JWT_SECRET=long-random-string-minimum-32-characters
GOOGLE_CLIENT_ID=xyz.apps.googleusercontent.com

# Database
DATABASE_URL=postgresql://user:pass@host/db

# Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# CORS
CORS_ORIGIN=http://localhost:3000,https://cine-mark.com

# Environment
NODE_ENV=production|development
PORT=5001
```

---

### 3. Token Expiration Strategy

**Current Implementation:**

- Access Token: 15 minutes (auto-refresh on client)
- Refresh Token: 7 days (user logs back in)

**Trade-offs:**

| Strategy              | Pros          | Cons                 |
| --------------------- | ------------- | -------------------- |
| **Short Lived (15m)** | High security | Frequent refresh     |
| **Long Lived (7d)**   | Better UX     | More time to exploit |
| **No Expiration**     | Maximum UX    | Security nightmare   |

---

### 4. Error Message Security

**Current Approach:**

```javascript
// ❌ RISKY - Reveals too much
throw new ApiError(401, "User with email not found");
throw new ApiError(401, "Password incorrect");

// ✅ SAFE - Generic message
throw new ApiError(401, "Invalid credentials");
throw new ApiError(400, "Invalid Token");
```

**Why Generic Messages:**

```
Attacker tries to enumerate users:
POST /login { email: "user1@example.com" }
Response: "User with email not found"

Attacker learns: user1@example.com not registered
Attacker learns: user2@example.com registered (got different error)

With generic messages:
All failed logins return: "Invalid credentials"
Attacker cannot enumerate users
```

---

## 8. Common Vulnerabilities & Mitigations

### Vulnerability #1: Token Replay Attack

**Attack:**

```
1. Attacker captures refresh token (via MITM, XSS, etc.)
2. Attacker uses old token to refresh: POST /refresh
3. Server generates new tokens for attacker
4. Attacker now has valid session
```

**Mitigation in Code:**

```javascript
// Every refresh generates NEW refresh token (old one invalidated)
export const refreshCookies = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  // Verify token matches stored token
  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Refresh token already used");
  }

  // Generate NEW tokens
  const newRefreshToken = jwt.sign(...);

  // Update stored token (old token now invalid)
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshToken }
  });
});

// Result: Old token cannot be used twice
```

---

### Vulnerability #2: Token Theft via XSS

**Attack:**

```
1. Attacker injects JavaScript on frontend
2. Script reads tokens from localStorage
3. Attacker's server receives tokens
4. Attacker uses tokens to impersonate user
```

**Mitigation:**

```javascript
// HTTP-Only cookies prevent JavaScript from reading
res.cookie("accessToken", token, {
  httpOnly: true, // document.cookie cannot access
});

// Result: XSS attack cannot steal tokens
// Note: XSS can still cause damage (modify page, redirect), but cannot steal tokens
```

---

### Vulnerability #3: Brute Force Login

**Attack:**

```
Attacker: curl -X POST /auth/google/login [1000 times per second]
Result: Try to guess valid Google tokens
```

**Mitigation:**

```javascript
app.use(limiter); // 100 requests per 15 minutes

// Result: After 100 requests, attacker blocked
// Brute force becomes impractical
```

---

### Vulnerability #4: Token Expiration Not Checked

**Attack:**

```
1. Legitimate access token captured
2. Token kept for months
3. Attacker uses expired token in request
```

**Mitigation:**

```javascript
// Every request verifies token expiration
const decodedToken = jwt.verify(token, JWT_SECRET);
// jwt.verify() automatically checks expiration
// If expired: throws TokenExpiredError
```

---

### Vulnerability #5: Insecure Cookie Storage

**Attack:**

```
Attacker: document.cookie
Result: All cookies readable (if not HttpOnly)
```

**Mitigation:**

```javascript
res.cookie("accessToken", token, {
  httpOnly: true, // JavaScript cannot read
  secure: true, // HTTPS only (cannot intercept)
  sameSite: "strict", // Cannot be sent to other sites
});
```

---

### Vulnerability #6: Missing HTTPS

**Attack:**

```
1. User on public WiFi
2. Attacker intercepts HTTP traffic (unencrypted)
3. Attacker captures access token
4. Attacker uses token to impersonate user
```

**Mitigation:**

```javascript
// Production only
const options = {
  secure: true  // Cookies only sent over HTTPS
};

// HSTS header forces HTTPS
"Strict-Transport-Security": "max-age=31536000; ..."
```

---

## Summary: Security Layers

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Transport Security (HTTPS/TLS)             │
│ - Encrypts all traffic                              │
│ - Prevents man-in-the-middle attacks                │
└─────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│ Layer 2: Rate Limiting                              │
│ - Prevents brute force attacks                      │
│ - Mitigates DDoS impact                             │
└─────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│ Layer 3: CORS                                       │
│ - Prevents requests from unauthorized origins      │
│ - Protects against cross-site attacks              │
└─────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│ Layer 4: Input Validation (Zod)                     │
│ - Prevents injection attacks                       │
│ - Validates data format                            │
└─────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│ Layer 5: Authentication (Google OAuth + JWT)        │
│ - Verifies user identity                           │
│ - Google OAuth removes password management burden  │
└─────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│ Layer 6: Authorization (verifyJwt middleware)       │
│ - Checks user has valid token                      │
│ - Fetches user from database                       │
└─────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│ Layer 7: Business Logic (Services)                  │
│ - Ownership checks (user owns resource)            │
│ - Data-level security                              │
└─────────────────────────────────────────────────────┘
```

---

## Security Checklist

- ✅ HTTPS enforced (secure cookies, HSTS)
- ✅ JWT tokens properly signed and validated
- ✅ Refresh tokens stored in database (replay prevention)
- ✅ Access tokens short-lived (15 minutes)
- ✅ HTTP-Only cookies (XSS protection)
- ✅ SameSite cookies (CSRF protection)
- ✅ Rate limiting enabled
- ✅ CORS properly configured
- ✅ Input validation with Zod
- ✅ Helmet security headers
- ✅ SQL injection prevented (Prisma ORM)
- ✅ Generic error messages (no information leakage)
- ✅ Environment variables for secrets
- ✅ JWT_SECRET strong and random
- ⚠️ No persistent session revocation (tokens valid until expiry)
- ⚠️ Token blacklist could be added for immediate revocation

---

## Recommendations

1. **Immediate:**
   - Verify JWT_SECRET is strong (> 32 characters)
   - Ensure CORS_ORIGIN configured for production domain
   - Test with HTTPS in production

2. **Short-term:**
   - Add request logging with suspicious patterns
   - Monitor refresh token reuse (potential compromise)
   - Add user-agent/IP-based anomaly detection

3. **Long-term:**
   - Implement token blacklist for immediate revocation
   - Add biometric authentication option
   - Implement device fingerprinting
   - Add audit logging for sensitive operations
