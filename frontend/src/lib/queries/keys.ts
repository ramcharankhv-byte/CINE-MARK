export const queryKeys = {
  auth: {
    user: ["auth", "user"] as const,
  },
  movies: {
    search: (query: string, page: number) => ["movies", "search", { query, page }] as const,
    detail: (imdbID: string) => ["movies", "detail", imdbID] as const,
  },
  watchlists: {
    list: (page: number, limit: number) => ["watchlists", "list", { page, limit }] as const,
    detail: (id: string, page: number, limit: number) => ["watchlists", "detail", id, { page, limit }] as const,
    search: (query: string) => ["watchlists", "search", query] as const,
  },
};
