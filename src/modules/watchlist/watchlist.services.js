import { prisma } from "../../config/db.js";
import { ApiError } from "../../utils/api-error.js";

export const createWatchlist = async (name, userId) => {
  return prisma.watchlist.create({
    data: {
      name,
      userId,
      status: "PLAN_TO_WATCH",
    },
  });
};

export const addMovieToWatchlist = async (watchlistId, movieId, userId) => {
  const watchlist = await prisma.watchlist.findUnique({
    where: { id: watchlistId },
    include: { movies: true },
  });

  if (!watchlist) {
    throw new ApiError(404, "Watchlist not found");
  }

  if (watchlist.userId !== userId) {
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
        connect: {
          id: movieId,
        },
      },
    },
  });
};

export const removeMovieFromWatchlist = async (
  watchlistId,
  movieId,
  userId,
) => {
  const watchlist = await prisma.watchlist.findUnique({
    where: { id: watchlistId },
    include: { movies: true },
  });

  if (!watchlist) {
    throw new ApiError(404, "Watchlist not found");
  }

  if (watchlist.userId !== userId) {
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
    where: { id: watchlistId },
    data: {
      movies: {
        disconnect: {
          id: movieId,
        },
      },
    },
  });
};

export const getAllWatchlists = async (userId) => {
  return prisma.watchlist.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getWatchlist = async (watchlistId, userId) => {
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

  if (watchlist.userId !== userId) {
    throw new ApiError(403, "Unauthorized");
  }

  return watchlist;
};

export const searchWatchlists = async (query, userId) => {
  return prisma.watchlist.findMany({
    where: {
      userId,
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
  });
};

export const deleteWatchlist = async (watchlistId, userId) => {
  const watchlist = await prisma.watchlist.findUnique({
    where: {
      id: watchlistId,
    },
  });

  if (!watchlist) {
    throw new ApiError(404, "Watchlist not found");
  }

  if (watchlist.userId !== userId) {
    throw new ApiError(403, "Unauthorized");
  }

  await prisma.watchlist.delete({
    where: {
      id: watchlistId,
    },
  });
};
