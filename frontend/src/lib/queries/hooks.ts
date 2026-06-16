import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { queryKeys } from "./keys";
import { Movie, Watchlist, PaginatedResponse, ApiResponse } from "@/types";
import { toast } from "sonner";

// --- MOVIES ---

export const useMovieSearch = (query: string, page: number) => {
  return useQuery({
    queryKey: queryKeys.movies.search(query, page),
    queryFn: async () => {
      if (!query) return null;
      const { data } = await api.get<ApiResponse<{ movies: Movie[], meta: any }>>(`/movie/search?query=${query}&page=${page}`);
      return data.data;
    },
    enabled: !!query,
  });
};

export const useMovieDetail = (imdbID: string) => {
  return useQuery({
    queryKey: queryKeys.movies.detail(imdbID),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Movie>>(`/movie/${imdbID}`);
      return data.data;
    },
    enabled: !!imdbID,
  });
};

// --- WATCHLISTS ---

export const useWatchlists = (page: number, limit: number) => {
  return useQuery({
    queryKey: queryKeys.watchlists.list(page, limit),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ watchlists: Watchlist[], meta: any }>>(`/watchlist?page=${page}&limit=${limit}`);
      return data.data;
    },
  });
};

export const useWatchlistDetail = (id: string, page: number, limit: number) => {
  return useQuery({
    queryKey: queryKeys.watchlists.detail(id, page, limit),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ watchlistInfo: Watchlist, movies: Movie[], meta: any }>>(`/watchlist/${id}?page=${page}&limit=${limit}`);
      return data.data;
    },
    enabled: !!id,
  });
};

export const useCreateWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<ApiResponse<Watchlist>>("/watchlist", { name });
      return data.data;
    },
    onSuccess: () => {
      toast.success("Watchlist created successfully");
      queryClient.invalidateQueries({ queryKey: ["watchlists", "list"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create watchlist");
    },
  });
};

export const useDeleteWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/watchlist/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      toast.success("Watchlist deleted");
      queryClient.invalidateQueries({ queryKey: ["watchlists", "list"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete watchlist");
    },
  });
};

export const useAddMovieToWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ watchlistId, movieId }: { watchlistId: string; movieId: string }) => {
      await api.post(`/watchlist/${watchlistId}/${movieId}`);
      return { watchlistId, movieId };
    },
    onMutate: async ({ watchlistId, movieId }) => {
      await queryClient.cancelQueries({ queryKey: ["watchlists", "detail", watchlistId] });
      const previousWatchlist = queryClient.getQueryData(["watchlists", "detail", watchlistId]);
      
      queryClient.setQueryData(["watchlists", "detail", watchlistId], (old: any) => {
        if (!old || !old.movies) return old;
        return {
          ...old,
          movies: [...old.movies, { imdbID: movieId, id: "temp-id" }]
        };
      });
      return { previousWatchlist };
    },
    onSuccess: (variables) => {
      toast.success("Movie added to watchlist");
    },
    onError: (error: any, variables, context: any) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(["watchlists", "detail", variables.watchlistId], context.previousWatchlist);
      }
      toast.error(error.response?.data?.message || "Failed to add movie to watchlist");
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watchlists", "detail", variables.watchlistId] });
      queryClient.invalidateQueries({ queryKey: ["watchlists", "list"] });
    }
  });
};

export const useRemoveMovieFromWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ watchlistId, movieId }: { watchlistId: string; movieId: string }) => {
      await api.delete(`/watchlist/${watchlistId}/${movieId}`);
      return { watchlistId, movieId };
    },
    onMutate: async ({ watchlistId, movieId }) => {
      await queryClient.cancelQueries({ queryKey: ["watchlists", "detail", watchlistId] });
      const previousWatchlist = queryClient.getQueryData(["watchlists", "detail", watchlistId]);
      
      queryClient.setQueryData(["watchlists", "detail", watchlistId], (old: any) => {
        if (!old || !old.movies) return old;
        return {
          ...old,
          movies: old.movies.filter((m: any) => m.imdbID !== movieId)
        };
      });
      return { previousWatchlist };
    },
    onSuccess: (variables) => {
      toast.success("Movie removed from watchlist");
    },
    onError: (error: any, variables, context: any) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData(["watchlists", "detail", variables.watchlistId], context.previousWatchlist);
      }
      toast.error(error.response?.data?.message || "Failed to remove movie");
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watchlists", "detail", variables.watchlistId] });
      queryClient.invalidateQueries({ queryKey: ["watchlists", "list"] });
    }
  });
};
