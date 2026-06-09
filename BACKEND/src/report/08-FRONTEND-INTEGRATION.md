# CINE-MARK Backend - Frontend Integration Guide

## Quick Start for Frontend Developers

This guide explains how to integrate the CINE-MARK API into your frontend application.

---

## Base URL

```
http://localhost:5001/api/v1
```

Production URL (replace with actual):

```
https://api.cine-mark.com/api/v1
```

---

## Authentication Flow

### 1. Initialize Google OAuth

**Install:**

```bash
npm install @react-oauth/google
```

**Setup (React example):**

```jsx
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

function App() {
  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <LoginComponent />
    </GoogleOAuthProvider>
  );
}
```

**Get Google Client ID:**

1. Go to https://console.cloud.google.com
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web Application)
5. Copy Client ID

---

### 2. Signup Flow

**Frontend Code:**

```javascript
const handleGoogleSignup = async (credentialResponse) => {
  try {
    const response = await fetch(
      "http://localhost:5001/api/v1/auth/google/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important: Send cookies
        body: JSON.stringify({
          idToken: credentialResponse.credential, // From Google
        }),
      },
    );

    if (!response.ok) throw new Error("Signup failed");

    const data = await response.json();

    // Store tokens
    localStorage.setItem("accessToken", data.data.accessToken);
    localStorage.setItem("refreshToken", data.data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.data.user));

    // Redirect to dashboard
    navigate("/dashboard");
  } catch (error) {
    console.error("Signup error:", error);
  }
};
```

**Response Structure:**

```json
{
  "statusCode": 201,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "picture": "https://..."
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  },
  "message": "User registered successfully with Google",
  "success": true
}
```

---

### 3. Login Flow

**Frontend Code:**

```javascript
const handleGoogleLogin = async (credentialResponse) => {
  try {
    const response = await fetch(
      "http://localhost:5001/api/v1/auth/google/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Cookies are set here
        body: JSON.stringify({
          idToken: credentialResponse.credential,
        }),
      },
    );

    if (!response.ok) throw new Error("Login failed");

    const data = await response.json();

    // Store tokens (already in cookies automatically)
    localStorage.setItem("accessToken", data.data.accessToken); // Optional, for fallback
    localStorage.setItem("user", JSON.stringify(data.data.user));

    navigate("/dashboard");
  } catch (error) {
    console.error("Login error:", error);
  }
};
```

---

### 4. Token Usage in Requests

**Option 1: Using Cookies (Recommended)**

```javascript
// Tokens automatically sent in cookies
const response = await fetch(
  "http://localhost:5001/api/v1/movie/search?query=Inception",
  {
    credentials: "include", // Important: Include cookies
  },
);
```

**Option 2: Using Authorization Header**

```javascript
const accessToken = localStorage.getItem("accessToken");

const response = await fetch(
  "http://localhost:5001/api/v1/movie/search?query=Inception",
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  },
);
```

**Best Practice: Use Cookies**

- Cookies are HTTP-Only on backend (secure)
- Automatically sent with requests
- No JavaScript access (XSS protection)
- Can fallback to header if needed

---

### 5. Token Refresh Automatically

**Setup Axios Interceptor (Recommended):**

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001/api/v1",
  withCredentials: true, // Include cookies
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Request new tokens
        await api.post("/auth/refresh");

        // Retry original request with new tokens
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

**Usage:**

```javascript
// Automatically handles refresh if needed
const movies = await api.get("/movie/search?query=Inception");
```

---

### 6. Logout

**Frontend Code:**

```javascript
const handleLogout = async () => {
  try {
    const accessToken = localStorage.getItem("accessToken");

    await fetch("http://localhost:5001/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Clear local storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    // Redirect to login
    navigate("/login");
  } catch (error) {
    console.error("Logout error:", error);
  }
};
```

---

## Movie Search Integration

### Search Movies

**Frontend Code:**

```javascript
const [movies, setMovies] = useState([]);
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(0);

const searchMovies = async (query) => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/v1/movie/search?query=${query}&page=${page}`,
      {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      },
    );

    if (!response.ok) throw new Error("Search failed");

    const data = await response.json();

    setMovies(data.data.movies);
    setTotalPages(data.data.meta.totalPages);
  } catch (error) {
    console.error("Search error:", error);
  }
};
```

**Response Format:**

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
        "Poster": "https://..."
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
  "success": true
}
```

### Display Movies with Pagination

```jsx
function SearchResults({ movies, totalPages, page, onPageChange }) {
  return (
    <div>
      <div className="movies-grid">
        {movies.map((movie) => (
          <div key={movie.imdbID} className="movie-card">
            <img src={movie.Poster} alt={movie.Title} />
            <h3>{movie.Title}</h3>
            <p>{movie.Year}</p>
            <button onClick={() => handleAddToWatchlist(movie.imdbID)}>
              Add to Watchlist
            </button>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

### Get Movie Details

**Frontend Code:**

```javascript
const getMovieDetails = async (imdbID) => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/v1/movie/${imdbID}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to fetch movie");

    const data = await response.json();
    return data.data; // Full movie object
  } catch (error) {
    console.error("Error:", error);
  }
};
```

---

## Watchlist Integration

### Create Watchlist

**Frontend Code:**

```javascript
const createWatchlist = async (name) => {
  try {
    const response = await fetch("http://localhost:5001/api/v1/watchlist", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) throw new Error("Failed to create watchlist");

    const data = await response.json();
    return data.data; // Watchlist object
  } catch (error) {
    console.error("Error:", error);
  }
};
```

**Usage:**

```javascript
const handleCreateWatchlist = async () => {
  const newWatchlist = await createWatchlist("My Favorites");
  console.log(newWatchlist); // { id: "...", name: "My Favorites", ... }
};
```

---

### Get All Watchlists

**Frontend Code:**

```javascript
const getAllWatchlists = async (page = 1) => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/v1/watchlist?page=${page}&limit=10`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to fetch watchlists");

    const data = await response.json();
    return data.data; // { watchlists: [...], meta: {...} }
  } catch (error) {
    console.error("Error:", error);
  }
};
```

---

### Get Watchlist with Movies

**Frontend Code:**

```javascript
const getWatchlist = async (watchlistId, page = 1) => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/v1/watchlist/${watchlistId}?page=${page}&limit=10`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to fetch watchlist");

    const data = await response.json();

    // Separate structure
    const { watchlistInfo, movies, meta } = data.data;

    return { watchlistInfo, movies, meta };
  } catch (error) {
    console.error("Error:", error);
  }
};
```

**Response Structure:**

```json
{
  "data": {
    "watchlistInfo": {
      "id": "uuid",
      "name": "My Watchlist",
      "createdAt": "..."
    },
    "movies": [
      {
        "id": "uuid",
        "imdbID": "tt1375666",
        "title": "Inception",
        ...
      }
    ],
    "meta": {
      "currentPage": 1,
      "limit": 10,
      "totalItems": 5,
      "totalPages": 1,
      "hasNextPage": false
    }
  }
}
```

---

### Add Movie to Watchlist

**Frontend Code:**

```javascript
const addMovieToWatchlist = async (watchlistId, movieId) => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/v1/watchlist/${watchlistId}/${movieId}`,
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to add movie");

    console.log("Movie added successfully");
  } catch (error) {
    console.error("Error:", error);
  }
};
```

**Usage:**

```javascript
const handleAddToWatchlist = async (movieId) => {
  await addMovieToWatchlist(watchlistId, movieId);

  // Refresh watchlist
  const watchlist = await getWatchlist(watchlistId);
  setMovies(watchlist.movies);
};
```

---

### Remove Movie from Watchlist

**Frontend Code:**

```javascript
const removeMovieFromWatchlist = async (watchlistId, movieId) => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/v1/watchlist/${watchlistId}/${movieId}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to remove movie");

    console.log("Movie removed successfully");
  } catch (error) {
    console.error("Error:", error);
  }
};
```

---

### Search Watchlists

**Frontend Code:**

```javascript
const searchWatchlists = async (query) => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/v1/watchlist/search?query=${query}`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Search failed");

    const data = await response.json();
    return data.data; // Array of watchlists
  } catch (error) {
    console.error("Error:", error);
  }
};
```

---

### Delete Watchlist

**Frontend Code:**

```javascript
const deleteWatchlist = async (watchlistId) => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/v1/watchlist/${watchlistId}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to delete watchlist");

    console.log("Watchlist deleted successfully");
  } catch (error) {
    console.error("Error:", error);
  }
};
```

---

## Error Handling

### Common Error Responses

```json
// 400 - Bad Request
{
  "statusCode": 400,
  "success": false,
  "message": "String must contain at least 1 character"
}

// 401 - Unauthorized
{
  "statusCode": 401,
  "success": false,
  "message": "Unauthorized"
}

// 403 - Forbidden
{
  "statusCode": 403,
  "success": false,
  "message": "Unauthorized"
}

// 404 - Not Found
{
  "statusCode": 404,
  "success": false,
  "message": "Watchlist not found"
}

// 409 - Conflict
{
  "statusCode": 409,
  "success": false,
  "message": "User already exists"
}

// 429 - Rate Limited
{
  "statusCode": 429,
  "success": false,
  "message": "Too many requests"
}
```

### Error Handler Hook (React)

```javascript
export const useApiCall = () => {
  const handleError = (error) => {
    if (!error.response) {
      return "Network error. Please check your connection.";
    }

    const status = error.response.status;
    const message = error.response.data?.message;

    switch (status) {
      case 400:
        return `Bad request: ${message}`;
      case 401:
        return "Session expired. Please log in again.";
      case 403:
        return "You do not have permission to access this.";
      case 404:
        return "Resource not found.";
      case 409:
        return `Conflict: ${message}`;
      case 429:
        return "Too many requests. Please wait before trying again.";
      case 500:
        return "Server error. Please try again later.";
      default:
        return message || "An error occurred.";
    }
  };

  return { handleError };
};
```

---

## Required Headers

```javascript
// All authenticated requests should include:
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`,
  'credentials': 'include'  // For cookies
}
```

---

## Recommended Frontend Architecture

```javascript
// api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true
});

// Handle 401 and refresh tokens
api.interceptors.response.use(...);

export default api;

// api/auth.js
export const signup = (idToken) => api.post('/auth/google/signup', { idToken });
export const login = (idToken) => api.post('/auth/google/login', { idToken });
export const logout = () => api.post('/auth/logout');
export const refresh = () => api.post('/auth/refresh');

// api/movies.js
export const searchMovies = (query, page) =>
  api.get(`/movie/search?query=${query}&page=${page}`);
export const getMovie = (imdbID) => api.get(`/movie/${imdbID}`);

// api/watchlists.js
export const getAllWatchlists = (page) =>
  api.get(`/watchlist?page=${page}&limit=10`);
export const getWatchlist = (id, page) =>
  api.get(`/watchlist/${id}?page=${page}&limit=10`);
export const createWatchlist = (name) =>
  api.post('/watchlist', { name });
export const addMovieToWatchlist = (watchlistId, movieId) =>
  api.post(`/watchlist/${watchlistId}/${movieId}`);
export const removeMovieFromWatchlist = (watchlistId, movieId) =>
  api.delete(`/watchlist/${watchlistId}/${movieId}`);
export const deleteWatchlist = (id) =>
  api.delete(`/watchlist/${id}`);
```

---

## Testing with Postman/Insomnia

**Setup:**

1. Import API collection
2. Set environment: `{{BASE_URL}}` = `http://localhost:5001/api/v1`
3. Set variable: `{{ACCESS_TOKEN}}` = token from signup/login

**Example Request:**

```
GET http://localhost:5001/api/v1/movie/search?query=Inception
Headers:
  Authorization: Bearer {{ACCESS_TOKEN}}
  Content-Type: application/json
```

---

## Rate Limiting Awareness

- **Limit:** 100 requests per 15 minutes per IP
- **Header:** `RateLimit-Remaining: X`
- **On Limit:** `429 Too Many Requests`

**Recommendation:** Add loading states and prevent rapid consecutive requests
