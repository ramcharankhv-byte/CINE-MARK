import { prisma } from "../../config/db.js";
import { OAuth2Client } from "google-auth-library";
import { asyncHandler } from "../../utils/asynchandler.js";

import { ApiError } from "../../utils/api-error.js";

import { ApiResponse } from "../../utils/api-response.js";

async function searchMoviesFromOMDB(name) {
  const apiUrl = `https://omdbapi.com/?apikey=${process.env.API_KEY}&s=${name}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new ApiError(404, `Could not fetch movie"`);
  }

  return await response.json();
}

export const searchMovie = asyncHandler(async (req, res) => {
  const { query } = req.query;

  const moviesList = await searchMoviesFromOMDB(query); // to only read the moviesList.Search
  // example of ouput
  //   {
  //   "Search": [
  //     {
  //       "Title": "Guntur Kaaram",
  //       "Year": "2024",
  //       "imdbID": "tt14564000",
  //       "Type": "movie",
  //       "Poster": "https://m.media-amazon.com/images/M/MV5BYjA3NTExNzMtNjA2Ny00NTFiLWFlNDctMjdiODliY2Y5ZThiXkEyXkFqcGc@._V1_SX300.jpg"
  //     }
  //   ],
  //   "totalResults": "1",
  //   "Response": "True"
  // }

  if (moviesList.Response === "False") {
    throw new ApiError(404, "no movies found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        movies: moviesList.Search,
        totalResults: moviesList.totalResults,
      },
      "movies fetched",
    ),
  );
});

export const getMovie = asyncHandler(async (req, res) => {
  const { imdbID } = req.params;

  let movie = await prisma.movie.findFirst({
    where: {
      imdbID: imdbID,
    },
  });

  if (!movie) {
    movie = await addMovie(imdbID);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, movie, "movie fetched succesfully"));
});

async function addMovie(imdbID) {
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
