import { prisma } from "../../config/db.js";
import { redisClient } from "../../config/redis.js";
import { ApiError } from "../../utils/api-error.js";

export async function searchMoviesFromOMDB(query, page = 1) {
  if (!process.env.API_KEY) {
    throw new ApiError(500, "OMDB API key not configured");
  }

  const cacheKey = `search:${query}`;

  try {
    // 1. Check cache
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      try {
        console.log("Cache Hit");
        return JSON.parse(cachedData);
      } catch (parseError) {
        console.error("Cache parse error:", parseError);
        // Continue to fetch from OMDB if cache is corrupted
      }
    }

    console.log("Cache Miss");

    // 2. Fetch actual data from OMDB
    const apiUrl = `https://omdbapi.com/?apikey=${process.env.API_KEY}&s=${encodeURIComponent(query)}&page=${page}`;
    const response = await fetch(apiUrl, { timeout: 10000 });

    if (!response.ok) {
      throw new ApiError(
        500,
        `OMDB API returned ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Check if OMDB returned an error
    if (data.Response === "False") {
      throw new ApiError(404, data.Error || "No movies found");
    }

    // 3. Save in Redis (don't fail if cache write fails)
    try {
      await redisClient.set(cacheKey, JSON.stringify(data), {
        EX: 3600, // 1 hour
      });
    } catch (cacheError) {
      console.error("Cache write error (non-fatal):", cacheError);
      // Don't throw - continue even if cache fails
    }

    return data;
  } catch (error) {
    console.error("Search error details:", error);
    // Re-throw ApiError or wrap in ApiError
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Search failed: ${error.message}`);
  }
}

export async function addMovie(imdbID) {
  if (!process.env.API_KEY) {
    throw new ApiError(500, "OMDB API key not configured");
  }

  try {
    const apiUrl = `https://omdbapi.com/?apikey=${process.env.API_KEY}&i=${imdbID}`;
    const response = await fetch(apiUrl, { timeout: 10000 });

    if (!response.ok) {
      throw new ApiError(500, `OMDB API returned ${response.status}`);
    }

    const movieData = await response.json();

    if (movieData.Response === "False") {
      throw new ApiError(404, movieData.Error || "Movie not found");
    }

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
        actors: movieData.Actors,
        plot: movieData.Plot,
        country: movieData.Country,
        poster: movieData.Poster,
        imdbRating:
          movieData.imdbRating === "N/A"
            ? null
            : parseFloat(movieData.imdbRating),
      },
    });

    return movie;
  } catch (error) {
    console.error("Add movie error:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Failed to add movie: ${error.message}`);
  }
}

export const findMovie = async (imdbID) => {
  const cacheKey = `movie:${imdbID}`;

  try {
    // 1. Try cache first
    const cachedMovie = await redisClient.get(cacheKey);

    if (cachedMovie) {
      try {
        console.log("Cache Hit");
        return JSON.parse(cachedMovie);
      } catch (parseError) {
        console.error("Cache parse error:", parseError);
        // Continue to database if cache is corrupted
      }
    }

    console.log("Cache Miss");

    // 2. Query database
    const movie = await prisma.movie.findFirst({
      where: {
        imdbID: imdbID,
      },
    });

    // 3. Cache the result (don't fail if caching fails)
    if (movie) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(movie), {
          EX: 3600,
        });
      } catch (cacheError) {
        console.error("Cache write error (non-fatal):", cacheError);
        // Don't throw - continue even if cache fails
      }
    }

    return movie;
  } catch (error) {
    console.error("Find movie error:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Failed to find movie: ${error.message}`);
  }
};
