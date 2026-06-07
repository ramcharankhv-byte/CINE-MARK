import { prisma } from "../../config/db.js";

import { ApiError } from "../../utils/api-error.js";

export async function searchMoviesFromOMDB(name) {
  const apiUrl = `https://omdbapi.com/?apikey=${process.env.API_KEY}&s=${name}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new ApiError(404, `Could not fetch movie"`);
  }

  return await response.json();
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
