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

  let movie = await prisma.movie.findUnique({
    where: { imdbID: movieId },
  });

  if (!movie) {
    const { addMovie } = await import("../movie/movie.services.js");
    movie = await addMovie(movieId);
  }

  const exists = watchlist.movies.some((m) => m.id === movie.id);

  if (exists) {
    throw new ApiError(400, "Movie already in watchlist");
  }

  await prisma.watchlist.update({
    where: { id: watchlistId },
    data: {
      movies: {
        connect: {
          id: movie.id,
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
    where: { imdbID: movieId },
  });

  if (!movie) {
    throw new ApiError(404, "Movie not found");
  }

  const exists = watchlist.movies.some((m) => m.id === movie.id);

  if (!exists) {
    throw new ApiError(404, "Movie not present in watchlist");
  }

  await prisma.watchlist.update({
    where: { id: watchlistId },
    data: {
      movies: {
        disconnect: {
          id: movie.id,
        },
      },
    },
  });
};
export const getAllWatchlists = async (userId, page = 1, limit = 10) => {
  // 1. Sanitize variables and calculate offset
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const skip = (safePage - 1) * safeLimit;

  // 2. Fetch data and count in parallel
  const [watchlists, totalItems] = await Promise.all([
    prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: skip,
      take: safeLimit,
      include: {
        _count: {
          select: { movies: true }
        }
      }
    }),
    prisma.watchlist.count({
      where: { userId },
    }),
  ]);

  // 3. Construct total pages and meta object
  const totalPages = Math.ceil(totalItems / safeLimit);

  return {
    watchlists,
    meta: {
      currentPage: safePage,
      limit: safeLimit,
      totalItems,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
};

export const getWatchlist = async (
  watchlistId,
  userId,
  page = 1,
  limit = 10,
) => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const skip = (safePage - 1) * safeLimit;

  // 1. Fetch watchlist basic info along with sliced movies, and count movies
  const watchlist = await prisma.watchlist.findUnique({
    where: { id: watchlistId },
    include: {
      movies: {
        skip: skip,
        take: safeLimit,
        // Add orderBy here if you want movies sorted by added date
      },
      _count: {
        select: { movies: true }
      }
    },
  });

  const totalMovies = watchlist ? watchlist._count.movies : 0;

  // 2. Route Protection Checks
  if (!watchlist) {
    throw new ApiError(404, "Watchlist not found");
  }

  if (watchlist.userId !== userId) {
    throw new ApiError(403, "Unauthorized");
  }

  // 3. Calculate pagination metadata
  const totalPages = Math.ceil(totalMovies / safeLimit);

  return {
    watchlistInfo: {
      id: watchlist.id,
      name: watchlist.name,
      userId: watchlist.userId,
      status: watchlist.status,
      createdAt: watchlist.createdAt,
    },
    movies: watchlist.movies, // Contains only the 10 movies for this specific page
    meta: {
      currentPage: safePage,
      limit: safeLimit,
      totalItems: totalMovies,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
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
    include: {
      _count: {
        select: { movies: true }
      }
    }
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
