import { prisma } from "../../config/db.js";

import { asyncHandler } from "../../utils/asynchandler.js";

import { ApiError } from "../../utils/api-error.js";

import { ApiResponse } from "../../utils/api-response.js";

import { searchMoviesFromOMDB, addMovie, findMovie } from "./movie.services.js";

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

  let movie = await findMovie(imdbID);

  if (!movie) {
    movie = await addMovie(imdbID);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, movie, "movie fetched succesfully"));
});
