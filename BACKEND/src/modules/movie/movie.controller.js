import { prisma } from "../../config/db.js";

import { asyncHandler } from "../../utils/asynchandler.js";

import { ApiError } from "../../utils/api-error.js";

import { ApiResponse } from "../../utils/api-response.js";

import { searchMoviesFromOMDB, addMovie, findMovie } from "./movie.services.js";

export const searchMovie = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);

  console.log(`🔍 Search request: query="${query}", page=${page}`);

  try {
    // Fetch from OMDB (with Redis caching)
    const moviesList = await searchMoviesFromOMDB(query, page);

    if (moviesList.Response === "False") {
      console.log(`❌ OMDB returned no results for: ${query}`);
      throw new ApiError(404, "No movies found");
    }

    // Calculate pagination metadata
    const totalResults = parseInt(moviesList.totalResults, 10) || 0;
    const limit = 10; // OMDB returns 10 per page
    const totalPages = Math.ceil(totalResults / limit);

    console.log(
      `✅ Search successful: ${moviesList.Search.length} results, ${totalResults} total`,
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          movies: moviesList.Search || [],
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
  } catch (error) {
    console.error(`❌ Search error for "${query}":`, error.message);
    throw error; // Let asyncHandler catch and format
  }
});

export const getMovie = asyncHandler(async (req, res) => {
  const { imdbID } = req.params;

  console.log(`🎬 Movie detail request: imdbID="${imdbID}"`);

  try {
    let movie = await findMovie(imdbID);

    if (!movie) {
      console.log(`⚠️ Movie not in DB, fetching from OMDB: ${imdbID}`);
      movie = await addMovie(imdbID);
    }

    console.log(`✅ Movie retrieved: ${movie.title}`);

    return res
      .status(200)
      .json(new ApiResponse(200, movie, "Movie fetched successfully"));
  } catch (error) {
    console.error(`❌ Movie detail error for "${imdbID}":`, error.message);
    throw error; // Let asyncHandler catch and format
  }
});
