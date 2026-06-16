import { prisma } from "../../config/db.js";
import { redisClient } from "../../config/redis.js";
import { ApiError } from "../../utils/api-error.js";
import { logger } from "../../config/logger.js";

const safeRedisGet = async (key) => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.warn({ err: error, key }, "Redis GET failed, skipping cache");
    return null;
  }
};

const safeRedisSet = async (key, value, options) => {
  try {
    await redisClient.set(key, value, options);
  } catch (error) {
    logger.warn({ err: error, key }, "Redis SET failed, skipping cache");
  }
};

export async function searchMoviesFromOMDB(query, page = 1) {
  const cacheKey = `search:${query}:${page}`;

  const cachedData = await safeRedisGet(cacheKey);

  if (cachedData) {
    return typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData;
  }

  const safeQuery = encodeURIComponent(query);
  const apiUrl = `https://omdbapi.com/?apikey=${process.env.API_KEY}&s=${safeQuery}&page=${page}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new ApiError(404, "Could not fetch movie");
  }
  const data = await response.json();

  await safeRedisSet(cacheKey, data, {
    ex: 3600,
  });

  return data;
}

export async function addMovie(imdbID) {
  const apiUrl = `https://omdbapi.com/?apikey=${process.env.API_KEY}&i=${imdbID}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new ApiError(404, "Could not find movie");
  }

  const movieData = await response.json();

  if (movieData.Response === "False") {
    throw new ApiError(404, movieData.Error);
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
}

export const findMovie = async (imdbID) => {
  const cacheKey = `movie:${imdbID}`;

  const cachedMovie = await safeRedisGet(cacheKey);

  if (cachedMovie) {
    return typeof cachedMovie === "string" ? JSON.parse(cachedMovie) : cachedMovie;
  }

  const movie = await prisma.movie.findFirst({
    where: {
      imdbID: imdbID,
    },
  });

  if (movie) {
    await safeRedisSet(cacheKey, movie, {
      ex: 3600,
    });
  }

  return movie;
};
