# CINE-MARK Backend - Database Schema Analysis

## Overview

The CINE-MARK database uses PostgreSQL (Neon) with Prisma ORM. The schema implements a relational data model supporting:

- User management with Google OAuth
- Movie catalog from OMDb
- User watchlists with movies
- Many-to-many relationship between watchlists and movies

---

## Complete Prisma Schema

```prisma
// Database Configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Prisma Client Generator
generator client {
  provider   = "prisma-client-js"
  engineType = "library"
}

// ============================================
// MODEL: User
// ============================================
model User {
  // Primary Key
  id             String   @id @default(uuid())

  // Authentication Fields
  email          String   @unique
  googleId       String   @unique
  refreshToken   String?

  // Profile Information
  name           String
  picture        String?

  // Timestamps
  createdAt      DateTime @default(now())

  // Relations
  watchlists     Watchlist[]
}

// ============================================
// MODEL: Movie
// ============================================
model Movie {
  // Primary Key
  id             String   @id @default(uuid())

  // OMDb Fields
  imdbID         String   @unique           // tt1234567 format
  title          String
  year           String
  type           String                     // movie, series, episode

  // Movie Details
  cast           String?                    // Comma-separated actors
  genre          String?                    // Comma-separated genres
  director       String?
  writer         String?
  actors         String?
  plot           String?
  country        String?

  // Media
  poster         String?                    // Poster image URL

  // Ratings
  imdbRating     Float?                     // 1.0 - 10.0

  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations (Many-to-Many with Watchlist)
  watchlists     Watchlist[]
}

// ============================================
// MODEL: Watchlist
// ============================================
model Watchlist {
  // Primary Key
  id             String   @id @default(uuid())

  // Attributes
  name           String

  // Status Enum
  status         WatchlistStatus @default(PLAN_TO_WATCH)

  // Foreign Key to User
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relations (Many-to-Many with Movie)
  movies         Movie[]

  // Timestamps
  createdAt      DateTime @default(now())

  // Constraints
  @@unique([userId])  // One watchlist per user (design choice)
}

// ============================================
// ENUM: WatchlistStatus
// ============================================
enum WatchlistStatus {
  PLAN_TO_WATCH
  COMPLETED
}
```

---

## Detailed Model Analysis

### 1. User Model

**Purpose:** Store user account information authenticated via Google OAuth

**Fields:**

| Field          | Type          | Constraints               | Purpose                       |
| -------------- | ------------- | ------------------------- | ----------------------------- |
| `id`           | String (UUID) | `@id`, `@default(uuid())` | Unique user identifier        |
| `email`        | String        | `@unique`                 | Contact email, must be unique |
| `googleId`     | String        | `@unique`                 | Google OAuth sub claim        |
| `refreshToken` | String?       | Optional                  | JWT refresh token for session |
| `name`         | String        | Required                  | User's display name           |
| `picture`      | String?       | Optional                  | Google profile picture URL    |
| `createdAt`    | DateTime      | `@default(now())`         | Account creation timestamp    |
| `watchlists`   | Watchlist[]   | Relation                  | All user's watchlists         |

**Unique Constraints:**

```
UNIQUE (email)        - Prevents duplicate email registrations
UNIQUE (googleId)     - Prevents duplicate Google accounts
```

**Rationale:**

- UUID for globally unique, non-sequential identifiers
- Google OAuth eliminates need for password management
- `picture` field syncs with Google profile
- `refreshToken` stored for token refresh without database query
- Relations on User allow querying user.watchlists

**Example Document:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "googleId": "118364307671776346543",
  "refreshToken": "eyJhbGc...",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/...",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Movie Model

**Purpose:** Store movie data fetched from OMDb API

**Fields:**

| Field        | Type          | Constraints               | Purpose                          |
| ------------ | ------------- | ------------------------- | -------------------------------- |
| `id`         | String (UUID) | `@id`, `@default(uuid())` | Unique movie identifier          |
| `imdbID`     | String        | `@unique`                 | OMDb IMDb ID (tt1234567)         |
| `title`      | String        | Required                  | Movie title                      |
| `year`       | String        | Required                  | Release year                     |
| `type`       | String        | Required                  | movie/series/episode             |
| `cast`       | String?       | Optional                  | Comma-separated actors           |
| `genre`      | String?       | Optional                  | Comma-separated genres           |
| `director`   | String?       | Optional                  | Director name(s)                 |
| `writer`     | String?       | Optional                  | Writer name(s)                   |
| `actors`     | String?       | Optional                  | Duplicate of cast field          |
| `plot`       | String?       | Optional                  | Movie plot/description           |
| `country`    | String?       | Optional                  | Country of origin                |
| `poster`     | String?       | Optional                  | Poster image URL                 |
| `imdbRating` | Float?        | Optional                  | IMDb rating (0-10)               |
| `createdAt`  | DateTime      | `@default(now())`         | When movie was stored            |
| `updatedAt`  | DateTime      | `@updatedAt`              | Last update timestamp            |
| `watchlists` | Watchlist[]   | Relation                  | Watchlists containing this movie |

**Unique Constraints:**

```
UNIQUE (imdbID)  - Only one record per OMDb movie
```

**Rationale:**

- Denormalized fields from OMDb (cast, genre, actors stored as strings)
- Strings chosen over arrays for PostgreSQL compatibility without JSON
- `imdbID` is unique identifier from OMDb
- `createdAt`/`updatedAt` track data lifecycle
- Many-to-many with Watchlist via implicit join table

**Example Document:**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "imdbID": "tt1375666",
  "title": "Inception",
  "year": "2010",
  "type": "movie",
  "cast": "Leonardo DiCaprio, Marion Cotillard, Ellen Page",
  "genre": "Action, Sci-Fi, Thriller",
  "director": "Christopher Nolan",
  "writer": "Christopher Nolan",
  "plot": "A skilled thief who steals corporate secrets...",
  "country": "USA, UK",
  "poster": "https://m.media-amazon.com/images/M/...",
  "imdbRating": 8.8,
  "createdAt": "2024-01-10T08:00:00.000Z",
  "updatedAt": "2024-01-10T08:00:00.000Z"
}
```

---

### 3. Watchlist Model

**Purpose:** Store user-created watchlists and track movie collections

**Fields:**

| Field       | Type            | Constraints               | Purpose                  |
| ----------- | --------------- | ------------------------- | ------------------------ |
| `id`        | String (UUID)   | `@id`, `@default(uuid())` | Unique watchlist ID      |
| `name`      | String          | Required                  | Watchlist title          |
| `userId`    | String          | Foreign Key               | Owner of watchlist       |
| `status`    | WatchlistStatus | `@default(PLAN_TO_WATCH)` | Completion status        |
| `user`      | User            | Relation                  | Reference to owning user |
| `movies`    | Movie[]         | Relation                  | Movies in this watchlist |
| `createdAt` | DateTime        | `@default(now())`         | Creation timestamp       |

**Unique Constraints:**

```
PRIMARY KEY: id
FOREIGN KEY: userId references User(id) ON DELETE CASCADE
UNIQUE: (userId)  - ONE watchlist per user (architectural decision)
```

**Rationale:**

- UUID for distributed uniqueness
- `status` enum for type-safety
- `onDelete: Cascade` - deleting user deletes their watchlists
- Many-to-many with Movie via implicit Prisma join table
- Single watchlist per user implies watchlist is default collection
- `createdAt` tracks when watchlist was created

**Example Document:**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "My Watchlist",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PLAN_TO_WATCH",
  "createdAt": "2024-01-15T10:35:00.000Z"
}
```

---

### 4. WatchlistStatus Enum

**Purpose:** Type-safe watchlist status values

**Values:**

```
PLAN_TO_WATCH  - Movies user wants to watch
COMPLETED      - Movies user has finished watching
```

**Usage:**

```prisma
status WatchlistStatus @default(PLAN_TO_WATCH)
```

**Benefit:** Database enforces only valid values (NOT: "finished", "watching", etc.)

---

## Entity Relationship Diagram (Text Format)

```
┌──────────────────┐
│      User        │
├──────────────────┤
│ id (PK) [UUID]   │
│ email (UNIQUE)   │◄─────────────────┐
│ googleId (UNIQUE)│                  │
│ refreshToken     │                  │
│ name             │                  │
│ picture          │                  │
│ createdAt        │                  │
└──────────────────┘                  │
        ▲                             │
        │                             │
        │ 1:Many                      │
        │ has                         │
        │                             │
┌──────────────────────────┐          │
│   Watchlist              │          │
├──────────────────────────┤          │
│ id (PK) [UUID]           │          │
│ name                     ├──────────┤
│ userId (FK)              │ owns
│ status (ENUM)            │
│ createdAt                │
└──────────────────────────┘
        │
        │ Many:Many
        │ contains
        │
        │  (Implicit join table created by Prisma)
        │
        ▼
┌──────────────────┐
│      Movie       │
├──────────────────┤
│ id (PK) [UUID]   │
│ imdbID (UNIQUE)  │
│ title            │
│ year             │
│ type             │
│ cast             │
│ genre            │
│ director         │
│ writer           │
│ actors           │
│ plot             │
│ country          │
│ poster           │
│ imdbRating       │
│ createdAt        │
│ updatedAt        │
└──────────────────┘
```

---

## Relationships Explained

### 1. User → Watchlist (One-to-Many)

**Cardinality:** One User has Many Watchlists

**Implementation:**

```prisma
// In User model
watchlists Watchlist[]

// In Watchlist model
userId String
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

**Cascade Behavior:**

```
User Deleted
    ↓
All user's Watchlists Deleted
    ↓
All relationships in join table removed
    ↓
Movies NOT deleted (other users may have them)
```

**Query Examples:**

```javascript
// Get all watchlists for a user
const watchlists = await prisma.watchlist.findMany({
  where: { userId: "user-id" },
});

// Create watchlist for user
const watchlist = await prisma.watchlist.create({
  data: { name: "My List", userId: "user-id" },
});

// Get user with all watchlists
const user = await prisma.user.findUnique({
  where: { id: "user-id" },
  include: { watchlists: true },
});
```

---

### 2. Watchlist → Movie (Many-to-Many)

**Cardinality:** One Watchlist has Many Movies, One Movie in Many Watchlists

**Implementation:**

```prisma
// In Watchlist model
movies Movie[]

// In Movie model
watchlists Watchlist[]
```

**Prisma Implicit Join Table:**
Prisma auto-creates junction table:

```sql
-- Auto-generated (not in schema)
CREATE TABLE _MovieToWatchlist (
  A String NOT NULL REFERENCES Movie(id) ON DELETE CASCADE,
  B String NOT NULL REFERENCES Watchlist(id) ON DELETE CASCADE,
  UNIQUE(A, B)
);
```

**Operations:**

```javascript
// Add movie to watchlist
await prisma.watchlist.update({
  where: { id: "watchlist-id" },
  data: {
    movies: {
      connect: { id: "movie-id" },
    },
  },
});

// Remove movie from watchlist
await prisma.watchlist.update({
  where: { id: "watchlist-id" },
  data: {
    movies: {
      disconnect: { id: "movie-id" },
    },
  },
});

// Get watchlist with movies
const watchlist = await prisma.watchlist.findUnique({
  where: { id: "watchlist-id" },
  include: { movies: true },
});

// Get all watchlists containing a movie
const watchlists = await prisma.watchlist.findMany({
  where: {
    movies: {
      some: { id: "movie-id" },
    },
  },
});
```

---

## Database Constraints & Indexing

### Constraints

**Primary Keys:**

```sql
User.id PRIMARY KEY
Movie.id PRIMARY KEY
Watchlist.id PRIMARY KEY
```

**Unique Constraints:**

```sql
User.email UNIQUE
User.googleId UNIQUE
Movie.imdbID UNIQUE
Watchlist.userId UNIQUE
```

**Foreign Keys:**

```sql
Watchlist.userId FOREIGN KEY REFERENCES User(id) ON DELETE CASCADE
```

**Not Null Constraints:**

```sql
User: id, email, googleId, name
Movie: id, imdbID, title, year, type
Watchlist: id, name, userId, status
```

### Indexes

**Implicit Indexes (by Prisma):**

```sql
-- Primary keys indexed by default
CREATE INDEX idx_user_id ON User(id);
CREATE INDEX idx_movie_id ON Movie(id);
CREATE INDEX idx_watchlist_id ON Watchlist(id);

-- Unique fields indexed by default
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_user_googleId ON User(googleId);
CREATE INDEX idx_movie_imdbID ON Movie(imdbID);

-- Foreign key indexed by default (some databases)
CREATE INDEX idx_watchlist_userId ON Watchlist(userId);
```

**Recommended Additional Indexes (not in schema):**

```sql
-- For common queries
CREATE INDEX idx_watchlist_createdAt ON Watchlist(createdAt DESC);
CREATE INDEX idx_movie_createdAt ON Movie(createdAt DESC);

-- For many-to-many queries
CREATE INDEX idx_movieToWatchlist_A ON _MovieToWatchlist(A);
CREATE INDEX idx_movieToWatchlist_B ON _MovieToWatchlist(B);
```

---

## Data Types & Choices

### String vs Text

**Used String for:**

- `User.name` - Typically short (< 100 chars)
- `Movie.title` - Typically short (< 200 chars)
- `Movie.genre` - Formatted as comma-separated
- `Movie.cast` - Formatted as comma-separated
- `Watchlist.name` - User-defined, short

**Used String? (Optional) for:**

- `Movie.plot` - Can be longer, but still stored as string
- `Movie.poster` - URL string
- `User.picture` - URL string
- `User.refreshToken` - JWT token string

**Alternative (Not Used) - Text:**

```
PLOT TEXT - Would allow unlimited length
```

**Rationale for String:**

- Most fields have reasonable max length
- VARCHAR default size sufficient
- Simplicity and performance

---

## Denormalization Choices

### Why Store duplicate cast in Movie?

```prisma
cast    String?   // From OMDb "Actors" field
actors  String?   // Duplicate of cast
```

**Reason:** Inconsistency in codebase (likely developer error)

**Should Be:**

```prisma
actors String?  // Remove one, keep other

// Or separate model for better structure:
model Actor {
  id String @id
  name String @unique
  movies Movie[] // Many-to-many with Movie
}
```

### Why Comma-Separated Strings?

**Current:** `genre: "Action, Sci-Fi, Thriller"`

**Alternative (Better for queries):**

```prisma
model Genre {
  id String @id
  name String @unique
  movies Movie[]  // Many-to-many
}

// In Movie:
genres Genre[]
```

**Trade-offs:**

| Aspect          | Comma-Separated | Separate Model              |
| --------------- | --------------- | --------------------------- |
| **Queries**     | LIKE '%Action%' | WHERE genre.name = 'Action' |
| **Complexity**  | Simple          | More joins                  |
| **Consistency** | No validation   | Enforced                    |
| **Storage**     | Denormalized    | Normalized                  |
| **OMDb Data**   | Direct mapping  | Requires parsing            |

**Current Choice Rationale:**

- OMDb API provides comma-separated strings
- Direct mapping requires no transformation
- Acceptable for current app scale

---

## Migration Strategy

### Database Initialization

**Initial Migration (schema.prisma creates this):**

```sql
CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "googleId" VARCHAR(255) UNIQUE NOT NULL,
  "refreshToken" TEXT,
  "name" VARCHAR(255) NOT NULL,
  "picture" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Movie" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "imdbID" VARCHAR(20) UNIQUE NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "year" VARCHAR(4) NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "cast" TEXT,
  "genre" VARCHAR(255),
  "director" VARCHAR(255),
  "writer" TEXT,
  "actors" TEXT,
  "plot" TEXT,
  "country" VARCHAR(255),
  "poster" VARCHAR(255),
  "imdbRating" FLOAT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Watchlist" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "userId" UUID NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "status" VARCHAR(50) DEFAULT 'PLAN_TO_WATCH',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "_MovieToWatchlist" (
  "A" UUID NOT NULL REFERENCES "Movie"("id") ON DELETE CASCADE,
  "B" UUID NOT NULL REFERENCES "Watchlist"("id") ON DELETE CASCADE,
  PRIMARY KEY ("A", "B")
);
```

### Applying Migrations

```bash
# Initialize database
npx prisma migrate dev --name init

# Create snapshot
npx prisma migrate dev --name add_feature

# Push to production (without creating migration file)
npx prisma db push
```

---

## Sample Data Queries

### Create User (Registration)

```javascript
const user = await prisma.user.create({
  data: {
    email: "john@example.com",
    googleId: "118364307671776346543",
    name: "John Doe",
    picture: "https://lh3.googleusercontent.com/...",
    refreshToken: "eyJhbGc...",
  },
});
```

### Add Movie to Database

```javascript
const movie = await prisma.movie.create({
  data: {
    imdbID: "tt1375666",
    title: "Inception",
    year: "2010",
    type: "movie",
    cast: "Leonardo DiCaprio, Marion Cotillard",
    genre: "Action, Sci-Fi",
    director: "Christopher Nolan",
    plot: "A skilled thief...",
    poster: "https://...",
    imdbRating: 8.8,
  },
});
```

### Create Watchlist

```javascript
const watchlist = await prisma.watchlist.create({
  data: {
    name: "Must Watch",
    userId: user.id,
    status: "PLAN_TO_WATCH",
  },
});
```

### Add Movie to Watchlist

```javascript
const updated = await prisma.watchlist.update({
  where: { id: watchlist.id },
  data: {
    movies: {
      connect: { id: movie.id },
    },
  },
  include: { movies: true },
});
```

### Get User with Complete Data

```javascript
const complete = await prisma.user.findUnique({
  where: { id: user.id },
  include: {
    watchlists: {
      include: {
        movies: true,
      },
    },
  },
});
```

---

## Scalability Considerations

### Current Limitations

1. **One Watchlist Per User**

   ```prisma
   @@unique([userId])  // Design choice enforcing single watchlist
   ```

   - Users cannot create multiple watchlists
   - Better for MVP, but limits features

2. **Denormalized Movie Data**
   - No normalization of genres, actors
   - Cannot efficiently query "all movies with Leonardo DiCaprio"

3. **No User Relationships**
   - Cannot share watchlists
   - Cannot see friends' watchlists
   - No collaborative lists

### Future Improvements

**Remove Single Watchlist Constraint:**

```prisma
model Watchlist {
  // Remove @@unique([userId])
  // Allow multiple watchlists per user
}
```

**Add Shared Watchlists:**

```prisma
model Watchlist {
  creatorId String
  creator User @relation("created", fields: [creatorId], references: [id])

  sharedWith User[] @relation("watchlistShares")
}

model UserWatchlistAccess {
  id String @id
  userId String
  watchlistId String
  accessLevel String // "view", "edit", "admin"

  @@unique([userId, watchlistId])
}
```

**Normalize Genres:**

```prisma
model Genre {
  id String @id
  name String @unique
  movies Movie[]
}

model Movie {
  genres Genre[]
}
```

---

## Summary

**Schema Characteristics:**

- ✅ Simple 3-table design with many-to-many relationship
- ✅ Proper use of UUIDs for distributed systems
- ✅ Cascade delete for data integrity
- ✅ Enum for type-safe status values
- ✅ Appropriate optional fields
- ⚠️ One-watchlist-per-user limitation
- ⚠️ Denormalized movie fields (easily searchable, not queried)
- ⚠️ Duplicate cast/actors fields

**Recommendations:**

1. Remove duplicate cast/actors field
2. Consider multiple watchlists per user (remove `@@unique([userId])`)
3. Add indexes for common queries if needed
4. Consider genre normalization for complex queries
