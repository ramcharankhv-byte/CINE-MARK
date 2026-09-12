export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface Movie {
  /**
   * Database id. Absent on search results, which come straight from OMDB and
   * are only persisted once a movie is opened or added to a watchlist.
   */
  id?: string;
  imdbID: string;
  title: string;
  year: string;
  type: string;
  /** Null when OMDB has no artwork; callers fall back to /no-poster.svg. */
  poster: string | null;
  genre?: string | null;
  director?: string | null;
  writer?: string | null;
  actors?: string | null;
  cast?: string | null;
  plot?: string | null;
  country?: string | null;
  /** Prisma stores this as a Float, so it arrives as a number, not a string. */
  imdbRating?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Watchlist {
  id: string;
  name: string;
  userId: string;
  status: "PLAN_TO_WATCH" | "COMPLETED";
  createdAt: string;
  _count?: {
    movies: number;
  };
  movies?: Movie[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
