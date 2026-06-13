export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface Movie {
  id: string;
  imdbID: string;
  title: string;
  year: string;
  type: string;
  poster: string;
  genre?: string;
  director?: string;
  writer?: string;
  actors?: string;
  plot?: string;
  country?: string;
  imdbRating?: string;
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
