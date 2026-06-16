# 🎬 CINE-MARK

**CINE-MARK** is a full-featured movie watchlist management platform. It allows users to search for movies, curate personal watchlists, manage authentication via Google OAuth, and receive intelligent movie recommendations based on their watchlist history. The platform also features a conversational AI chatbot to help users discover new films.

The project is structured into three distinct modules:

- **🔧 Backend**: A robust REST API built with Node.js, Express, and Prisma that handles authentication, movie data, and watchlist management.
- **🎨 Frontend**: A modern and responsive web application built with Next.js, React, and Tailwind CSS, providing an immersive user experience.
- **🧠 ML Service**: A machine learning engine built with FastAPI and Python that powers the recommendation system and conversational AI chatbot.

---

## 🧭 Architecture Overview

The platform follows a decoupled architecture where the Frontend, Backend, and ML Service communicate via REST APIs.

- **User Authentication**: Managed by the Backend using Google OAuth 2.0 and stateless JWTs stored in HTTP-only cookies.
- **Movie Data**: Fetched from the OMDB API (via the Backend) and stored in the database for watchlist management.
- **Recommendations**: The ML service provides personalized movie suggestions based on collaborative filtering using the user's watchlist history.
- **AI Chatbot**: A conversational interface powered by a Large Language Model (Groq) that can search the web to provide up-to-date movie suggestions.
- **Data Flow**:
  1. The **Frontend** communicates with the **Backend** for all user-related actions (authentication, watchlist CRUD, movie search).
  2. The **Frontend** also communicates directly with the **ML service** for fetching recommendations and using the chatbot.
  3. The **ML service** accesses the same PostgreSQL database as the Backend to read watchlist data for generating recommendations and uses Upstash Vector for storing chat history.
  4. The ML service also interfaces with external APIs (OMDB, Groq, DuckDuckGo) for its functionalities.

---

## 🔧 Backend (`/Backend`)

The Backend is the core API for the CINE-MARK platform, responsible for user authentication, movie data management, and watchlist operations.

### 🛠️ Built With

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **Language**: TypeScript / JavaScript
- **ORM**: Prisma 6
- **Database**: PostgreSQL
- **Authentication**: Google OAuth 2.0 (`google-auth-library`) & JWT
- **Validation**: Zod 4
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan, Pino
- **Other**: `bcrypt` (for password hashing), `cookie-parser`, `multer`

### ✨ Features

- **Google OAuth 2.0** – Sign up and log in with a Google account; no password required.
- **JWT Authentication** – Stateless access tokens + refresh tokens stored in HTTP-only cookies.
- **Movie Search** – Query movies by title using the IMDb dataset; returns posters, year, and type.
- **Movie Detail Lookup** – Retrieve full metadata (genre, plot, cast, ratings) by `imdbID`.
- **Watchlist CRUD** – Create, read, search, and delete personal watchlists.
- **Watchlist ↔ Movie Management** – Add or remove movies from any watchlist.
- **Schema Validation** – All inputs validated with **Zod** (string lengths, UUID formats, imdbID regex).
- **Structured Error Responses** – Consistent JSON error envelopes with status codes and messages.
- **CORS & Cookie Support** – Configured for cross-origin frontends via `cors` and `cookie-parser`.
- **Request Logging** – HTTP request logging with **Morgan**.

### 📁 Key Files

- `package.json` – Manages dependencies and scripts (development server: `nodemon src/server.js`).
- `prisma.config.ts` – Prisma ORM configuration for database schema and migrations.
- `src/server.js` – Entry point that configures middleware, routes, and starts the server.

### ⚙️ Setup & Environment

1. Navigate to the Backend directory: `cd Backend`
2. Install dependencies: `npm install`
3. Configure environment variables (see `.env.example`):
   - `DATABASE_URL`: PostgreSQL connection string.
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: For OAuth.
   - `JWT_SECRET`, `REFRESH_TOKEN_SECRET`: For token signing.
   - `API_KEY`: OMDB API key.
4. Run database migrations: `npx prisma migrate dev`
5. Start the development server: `npm run dev`

---

## 🎨 Frontend (`/frontend`)

The Frontend is a modern, responsive web application that serves as the user interface for CINE-MARK. It provides a sleek and intuitive way to browse movies, manage watchlists, and interact with AI-powered features.

### 🛠️ Built With

- **Framework**: Next.js 16 (React 19) – App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4, `tailwind-merge`
- **UI Components**: Radix UI (Dialog, Label, Slot, Switch), `@base-ui/react`, `cmdk` (Command Palette), `vaul` (Drawer)
- **State Management**: `@tanstack/react-query` (server-state synchronization)
- **Authentication**: `@react-oauth/google`
- **Charts & 3D**: `recharts`, `three.js`, `@types/three`
- **Utilities**: `fuse.js` (fuzzy search), `clsx`, `sonner` (toasts), `next-themes` (dark mode), `lucide-react` (icons)
- **Development**: ESLint, PostCSS, TypeScript

### ✨ Features

- **Google Authentication** – Seamless login and registration using Google accounts.
- **Movie Discovery** – Search for movies by title and view detailed information.
- **Personal Watchlists** – Create, manage, and organize movies into custom watchlists.
- **AI-Powered Recommendations** – Get personalized movie suggestions based on your watchlist history (powered by the ML service).
- **Conversational AI Chatbot** – Interact with a movie bot that can search the web to recommend the newest movies based on your queries.
- **Responsive Design** – Fully responsive UI that adapts to desktop, tablet, and mobile devices.
- **Dark Mode** – Toggle between light and dark themes for comfortable viewing.
- **Fast Search** – Client-side fuzzy search for quick movie lookups via Fuse.js.

### 📁 Key Directories

- `src/app/(main)/[[...slug]]/page.tsx` – The main application page component that handles routing and rendering of the primary UI.
- `src/components` – Reusable UI components (e.g., movie cards, watchlist cards, modals).
- `src/hooks` – Custom React hooks for data fetching and state management.
- `public/` – Static assets (images, fonts, etc.).

### ⚙️ Setup & Environment

1. Navigate to the Frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Configure environment variables (see `.env.example`):
   - `NEXT_PUBLIC_API_URL`: Backend API base URL (e.g., `http://localhost:8080/api/v1`).
   - `NEXT_PUBLIC_ML_API_URL`: ML service API base URL (e.g., `http://localhost:8000`).
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Your Google OAuth client ID.
4. Start the development server: `npm run dev`

---

## 🧠 ML Service (`/ML`)

The ML Service is a Python-based microservice that powers the intelligent features of CINE-MARK: a collaborative filtering recommendation engine and a conversational AI chatbot. It runs as a standalone FastAPI application.

### 🛠️ Built With

- **Framework**: FastAPI (Uvicorn server)
- **Language**: Python 3
- **AI/ML**: `scikit-learn` (cosine similarity for recommendations)
- **LLM Integration**: `groq` (Groq API client for the LLM-powered chat)
- **Web Search**: `duckduckgo-search` (for real-time movie data)
- **Database**: `sqlalchemy`, `psycopg2-binary` (to connect to the main PostgreSQL DB)
- **Vector Database**: `upstash-vector` (for storing and retrieving chat conversation history)
- **Data Manipulation**: `pandas`
- **Environment**: `python-dotenv`
- **Other**: `pydantic` (data validation)

### ✨ Features

- **Personalized Movie Recommendations** – Uses collaborative filtering (item-item cosine similarity) based on the movies in a user's watchlist. If a user has no history, trending movies are shown instead.
- **AI Chatbot Endpoint** – Accepts user queries and leverages Groq's LLM (via the `llama-3.1-8b-instant` model) to generate conversational responses and extract recommended movie titles.
- **Real-time Web Search Integration** – For user queries about new movies, the service uses DuckDuckGo to fetch up-to-date web results and includes them in the LLM's context.
- **Conversation Memory** – Chat history is stored in Upstash Vector and retrieved to maintain context across sessions (session-aware).
- **Session Management** – Provides endpoints to fetch recent chat sessions, retrieve full chat history, and delete sessions (sidebar management for the frontend).
- **OMDB Integration** – The LLM's output (movie titles) can be used to fetch complete metadata from OMDB via the same API key used by the backend.
- **Trending Movies Fallback** – If collaborative filtering yields no results, the service falls back to a trending movies query (most watchlisted movies across all users).

### 📁 Key Files

- `run.py` – Entry point to start the Uvicorn server (runs `app.main:app`).
- `requirements.txt` – Lists all Python dependencies.
- `app/main.py` – FastAPI application definition, CORS setup, and route handlers.
- `app/groq_stuff.py` – Contains the `get_groq_response` function, which handles the LLM interaction, web search, and OMDB lookup for movie metadata.
- `app/recommendation.py` – Implements the `get_recommendations_for_user` function, which performs collaborative filtering and trending movie logic.
- `app/db_stuff.py` – Manages chat history storage and retrieval using Upstash Vector.
- `app/` – Contains all core application logic.

### ⚙️ Setup & Environment

1. Navigate to the ML directory: `cd ML`
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: `venv\Scripts\activate`
   ```
3. Install dependencies: pip install -r requirements.txt

Configure environment variables (must be present in the Backend's .env file as the service loads it):

DATABASE_URL: PostgreSQL connection string (must point to the same DB as the Backend).

API_KEY: OMDB API key.

GROQ_API_KEYS: Comma-separated list of Groq API keys.

UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN: Upstash Vector credentials for chat history.

Run the service: python run.py

## 📡 API Reference

All protected routes require the header:

```
Authorization: Bearer <accessToken>
```

### 🔐 Auth Endpoints

| Method | Endpoint              | Auth   | Description                   |
| ------ | --------------------- | ------ | ----------------------------- |
| `POST` | `/auth/google/signup` | ❌     | Register with Google ID token |
| `POST` | `/auth/google/login`  | ❌     | Login with Google ID token    |
| `POST` | `/auth/refresh`       | Cookie | Refresh access token          |
| `POST` | `/auth/logout`        | ✅ JWT | Invalidate session            |

**Google Signup / Login Request Body:**

```json
{ "idToken": "YOUR_GOOGLE_ID_TOKEN" }
```

**Success Response (201):**

```json
{
  "statusCode": 201,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "picture": "url"
    },
    "accessToken": "jwt_token",
    "refreshToken": "jwt_token"
  },
  "message": "User registered successfully"
}
```

---

### 🎬 Movie Endpoints _(All Protected)_

| Method | Endpoint                     | Description                          |
| ------ | ---------------------------- | ------------------------------------ |
| `GET`  | `/movie/search?query=Matrix` | Search movies by title (1–100 chars) |
| `GET`  | `/movie/:imdbId`             | Get full movie details by IMDb ID    |

**imdbID format:** `tt` followed by digits — e.g., `tt0133093`

**Search Response:**

```json
{
  "statusCode": 200,
  "data": {
    "movies": [
      {
        "Title": "The Matrix",
        "Year": "1999",
        "imdbID": "tt0133093",
        "Type": "movie",
        "Poster": "url"
      }
    ],
    "totalResults": "1"
  },
  "message": "movies fetched"
}
```

---

### 📝 Watchlist Endpoints _(All Protected)_

| Method   | Endpoint                           | Description                     |
| -------- | ---------------------------------- | ------------------------------- |
| `GET`    | `/watchlist`                       | List all user watchlists        |
| `POST`   | `/watchlist`                       | Create a watchlist (`{ name }`) |
| `GET`    | `/watchlist/search?query=`         | Search watchlists by name       |
| `GET`    | `/watchlist/:watchlistId`          | Get watchlist with its movies   |
| `DELETE` | `/watchlist/:watchlistId`          | Delete a watchlist              |
| `POST`   | `/watchlist/:watchlistId/:movieId` | Add movie to watchlist          |
| `DELETE` | `/watchlist/:watchlistId/:movieId` | Remove movie from watchlist     |

**Create Watchlist Body:**

```json
{ "name": "My Favorite Movies" }
```

---

### ❌ Error Response Format

```json
{
  "success": false,
  "message": "Descriptive error message",
  "errors": []
}
```

| Status | Reason                                       |
| ------ | -------------------------------------------- |
| `400`  | Validation error (bad input, invalid format) |
| `401`  | Missing or expired JWT                       |
| `404`  | Resource not found                           |
| `500`  | Internal server error                        |

---

## 🔄 Authentication Flow

```
1. Client obtains a Google ID token via Google Sign-In
2. Client sends token to POST /auth/google/signup or /login
3. Backend verifies token with Google via google-auth-library
4. Backend creates/fetches user, issues:
     - accessToken  (short-lived JWT, e.g. 15 minutes)
     - refreshToken (long-lived JWT, stored in HTTP-only cookie)
5. Client stores accessToken and uses it in Authorization header
6. On expiry, client calls POST /auth/refresh (sends cookie)
7. Backend issues new accessToken
```

---
## 🗄 Database Schema

The Prisma schema defines three core models:

**User** — stores Google profile data (id, email, name, picture)

**Movie** — cached IMDb movie records (id, imdbId, title, year, genre, plot, type, poster)

**Watchlist** — user-created lists with a many-to-many relationship to Movie

The `Watchlist ↔ Movie` join is managed through an implicit Prisma relation table, keeping the schema clean and queries efficient.

---

## 🧪 Testing

Three test files are included at the project root:

| File                  | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `test-api.js`         | Lightweight Node.js scripts to hit all endpoints |
| `test-postman-api.js` | Postman-compatible helper for manual testing     |
| `test-routes.js`      | Route-level unit/integration tests               |

**All 14 endpoints have been tested and verified:**

- ✅ 4 Auth endpoints
- ✅ 2 Movie endpoints
- ✅ 8 Watchlist endpoints

**Middleware verified:**

- ✅ JWT verification
- ✅ Zod schema validation
- ✅ Structured error handling
- ✅ CORS

**Postman Quick Setup:**

1. Set environment variable `base_url` → `http://localhost:8080/api/v1`
2. After login, capture `accessToken` with a post-response script:
   ```js
   pm.environment.set("access_token", pm.response.json().data.accessToken);
   ```
3. Use `Authorization: Bearer {{access_token}}` on all protected requests.

---


🤝 Contributors
This project was built collaboratively by:

ramcharankhv-byte – Backend,

Someshwar-prox – ML integration

📄 License
This project is licensed under the ISC License.

🚀 Deployment
The project is configured for deployment on Vercel (frontend) and traditional hosting (backend and ML service). For production:

Frontend: Deploy the frontend folder to Vercel, ensuring environment variables are set.

Backend: Deploy the Backend folder to a Node.js hosting service (e.g., Railway, Heroku, or a VPS).

ML Service: Deploy the ML folder as a Python application to a service that supports FastAPI (e.g., Railway, Hugging Face Spaces, or a VPS with Python).

💡 Future Improvements
Add support for social features (share watchlists, follow friends).

Implement collaborative filtering at scale using a dedicated vector database for user-item interactions.

Add caching layer (e.g., Upstash Redis) for frequently accessed movie data.

Enhance the recommendation engine with content-based filtering (using movie genres, cast, etc.).

Add user ratings and reviews for movies in watchlists.

Built with ❤️ by [ramcharankhv-byte](https://github.com/ramcharankhv-byte) and [Someshwar-prox](https://github.com/Someshwar-prox)


