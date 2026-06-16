import { prisma } from "../../config/db.js";

import { asyncHandler } from "../../utils/asynchandler.js";

import { ApiError } from "../../utils/api-error.js";

import { ApiResponse } from "../../utils/api-response.js";

import { searchMoviesFromOMDB, addMovie, findMovie } from "./movie.services.js";

import { transcribeAudio } from "../../utils/groq.js";

export const searchMovie = asyncHandler(async (req, res) => {
  const { query } = req.validatedData;

  // 1. Extract and sanitize the page number (default to page 1)
  const page = Math.max(1, Number(req.query.page) || 1);

  // 2. Pass the page variable to your OMDB fetching utility
  const moviesList = await searchMoviesFromOMDB(query, page);

  if (moviesList.Response === "False") {
    throw new ApiError(404, "No movies found");
  }

  // 3. Parse total results and calculate page metadata
  const totalResults = parseInt(moviesList.totalResults, 10) || 0;
  const limit = 10; // OMDB API strictly returns 10 items per page
  const totalPages = Math.ceil(totalResults / limit);

  // 4. Return data along with the meta tracking object
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        movies: moviesList.Search.map((m) => ({
          imdbID: m.imdbID,
          title: m.Title,
          year: m.Year,
          type: m.Type,
          poster: m.Poster,
        })),
        meta: {
          currentPage: page,
          limit,
          totalResults,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Movies fetched successfully",
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

export const transcribeMovieAudio = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Audio file is required for transcription");
  }

  const { buffer, originalname, mimetype } = req.file;

  const result = await transcribeAudio(buffer, originalname, mimetype);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Audio transcribed successfully"));
});
