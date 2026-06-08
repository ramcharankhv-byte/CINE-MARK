import { prisma } from "../../config/db.js";
import { redisClient } from "../../config/redis.js";
import { ApiError } from "../../utils/api-error.js";

export async function searchMoviesFromOMDB(query, page = 1) {
  const cacheKey = `search:${query}`;

  // 1. Check cache
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    console.log("Cache Hit");

    return JSON.parse(cachedData);
  }

  console.log("Cache Miss");

  // 2. Fetch actual data
  const apiUrl = `https://omdbapi.com/?apikey=${process.env.API_KEY}&s=${query}&page=${page}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new ApiError(404, `Could not fetch movie"`);
  }
  const data = await response.json();

  // 3. Save in Redis
  await redisClient.set(cacheKey, JSON.stringify(data), {
    EX: 3600, // 1 hour
  });

  return data;
}

export async function addMovie(imdbID) {
  const apiUrl = `https://omdbapi.com/?apikey=${process.env.API_KEY}&i=${imdbID}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new ApiError(404, `could not find movie"`);
  }

  const movieData = await response.json();

  if (movieData.Response === "False") {
    throw new ApiError(404, movieData.Error);
  }

  const movie = await prisma.movie.create({
    data: {
      imdbId: movieData.imdbID,
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
      rating:
        movieData.imdbRating === "N/A"
          ? null
          : parseFloat(movieData.imdbRating),
    },
  });

  return movie;
}

export const findMovie = async (imdbID) => {
  const cacheKey = `movie:${imdbID}`;

  const cachedMovie = await redisClient.get(cacheKey);

  if (cachedMovie) {
    console.log("Cache Hit");

    return JSON.parse(cachedMovie);
  }

  console.log("Cache Miss");

  const movie = prisma.movie.findFirst({
    where: {
      imdbID: imdbID,
    },
  });

  await redisClient.set(cacheKey, JSON.stringify(movie), {
    EX: 3600,
  });

  return movie;
};
