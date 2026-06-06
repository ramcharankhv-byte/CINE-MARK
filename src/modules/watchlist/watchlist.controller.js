import { prisma } from "../../config/db.js";

import { asyncHandler } from "../../utils/asynchandler.js";

import { ApiError } from "../../utils/api-error.js";

import { ApiResponse } from "../../utils/api-response.js";

export const createWatchList = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const userId = req.user?.id;

  const watchlist = await prisma.watchlist.create({
    data: {
      name: name,
      userId: userId,
      status: "PLAN_TO_WATCH",
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(200, watchlist, "watchlist created"));
});

export const addMovieToWatchlist = asyncHandler(async (req, res) => {
  const { watchlistId, movieId } = req.params;

  const watchlist = await prisma.watchlist.findUnique({
    where: { id: watchlistId },
    include: { movies: true },
  });

  if (!watchlist) {
    throw new ApiError(404, "Watchlist not found");
  }

  if (watchlist.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized");
  }

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
  });

  if (!movie) {
    throw new ApiError(404, "Movie not found");
  }

  const exists = watchlist.movies.some((movie) => movie.id === movieId);

  if (exists) {
    throw new ApiError(400, "Movie already in watchlist");
  }

  await prisma.watchlist.update({
    where: { id: watchlistId },
    data: {
      movies: {
        connect: { id: movieId },
      },
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Movie added to watchlist"));
});

export const removeMovieFromWatchlist = asyncHandler(async (req, res) => {
  const { watchlistId, movieId } = req.params;

  const watchlist = await prisma.watchlist.findUnique({
    where: { id: watchlistId },
    include: { movies: true },
  });

  if (!watchlist) {
    throw new ApiError(404, "Watchlist not found");
  }

  if (watchlist.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized");
  }

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
  });

  if (!movie) {
    throw new ApiError(404, "Movie not found");
  }

  const exists = watchlist.movies.some((movie) => movie.id === movieId);

  if (!exists) {
    throw new ApiError(404, "Movie not present in watchlist");
  }

  await prisma.watchlist.update({
    where: {
      id: watchlistId,
    },
    data: {
      movies: {
        disconnect: {
          id: movieId,
        },
      },
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Movie removed from watchlist"));
});

export const getAllWatchlists = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const watchlists = await prisma.watchlist.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, watchlists, "Watchlists fetched successfully"));
});

export const getWatchlist = asyncHandler(async (req, res) => {
  const { watchlistId } = req.params;

  const watchlist = await prisma.watchlist.findUnique({
    where: {
      id: watchlistId,
    },
    include: {
      movies: true,
    },
  });

  if (!watchlist) {
    throw new ApiError(404, "Watchlist not found");
  }

  if (watchlist.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, watchlist, "Watchlist fetched successfully"));
});

export const searchWatchlists = asyncHandler(async (req, res) => {
  const { query } = req.query;

  const watchlists = await prisma.watchlist.findMany({
    where: {
      userId: req.user.id,
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, watchlists, "Watchlists fetched successfully"));
});

export const deleteWatchlist = asyncHandler(async (req, res) => {
  const { watchlistId } = req.params;

  const watchlist = await prisma.watchlist.findUnique({
    where: {
      id: watchlistId,
    },
  });

  if (!watchlist) {
    throw new ApiError(404, "Watchlist not found");
  }

  if (watchlist.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized");
  }

  await prisma.watchlist.delete({
    where: {
      id: watchlistId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Watchlist deleted successfully"));
});
