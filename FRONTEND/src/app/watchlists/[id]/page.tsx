"use client";

import { useWatchlistDetail, useRemoveMovieFromWatchlist } from "@/lib/queries/hooks";
import { MovieGrid } from "@/components/movies/MovieGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { Loader2, ListVideo, AlertCircle, ChevronLeft, Trash2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

function WatchlistDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const id = params.id as string;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 20;

  const { data, isLoading, isError, error } = useWatchlistDetail(id, page, limit);
  const removeMutation = useRemoveMovieFromWatchlist();

  const handlePageChange = (newPage: number) => {
    const searchParamsNew = new URLSearchParams(searchParams);
    searchParamsNew.set("page", newPage.toString());
    router.push(`/watchlists/${id}?${searchParamsNew.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Watchlist Not Found"
        description={(error as any)?.message || "We couldn't load this watchlist."}
        actionLabel="Go Back"
        onAction={() => router.back()}
      />
    );
  }

  const { watchlistInfo, movies, meta } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-6 relative z-10 pb-12">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
      `}</style>

      {/* Premium Header */}
      <div className="pt-8 pb-6 border-b border-white/5 fade-in-up relative">
        <Button
          variant="ghost"
          className="mb-6 -ml-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full px-4 h-9"
          onClick={() => router.back()}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Watchlists
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-4 leading-[1.1]">
              {watchlistInfo.name}
            </h1>
            <div className="flex items-center gap-3 text-sm text-white/40 font-light">
              <Badge 
                variant={watchlistInfo.status === "COMPLETED" ? "default" : "secondary"}
                className="bg-primary/20 hover:bg-primary/30 text-primary border-none tracking-widest text-[10px] uppercase font-bold"
              >
                {watchlistInfo.status?.replace(/_/g, " ") || "PLAN TO WATCH"}
              </Badge>
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                <ListVideo className="h-3.5 w-3.5" />
                <span>{meta.totalItems} movies</span>
              </span>
              <span className="opacity-50">•</span>
              <span>Created {new Date(watchlistInfo.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <Button 
            onClick={() => router.push("/movies/search")} 
            className="rounded-xl bg-white text-black hover:bg-white/90 h-11 px-8 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all hover:scale-105 active:scale-95"
          >
            + Add Movies
          </Button>
        </div>
      </div>

      {movies.length === 0 ? (
        <div className="mt-12 fade-in-up delay-100">
          <EmptyState
            icon={ListVideo}
            title="Watchlist is empty"
            description="You haven't added any movies to this watchlist yet."
            actionLabel="Search Movies"
            onAction={() => router.push("/movies/search")}
          />
        </div>
      ) : (
        <div className="space-y-12 mt-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 fade-in-up delay-100">
            {movies.map((movie) => {
              const posterSrc =
                movie.poster && movie.poster !== "N/A"
                  ? movie.poster
                  : "/no-poster.svg";

              return (
                <div key={movie.imdbID} className="group relative rounded-[24px] bg-[#09090b]/80 backdrop-blur-3xl border border-white/10 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)] hover:border-white/20 flex flex-col h-full">
                  <Link href={`/movies/${movie.imdbID}`} className="relative aspect-[2/3] w-full overflow-hidden block">
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-60 group-hover:opacity-40 transition-opacity"></div>
                    <Image
                      src={posterSrc}
                      alt={`Poster for ${movie.title}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </Link>
                  <div className="flex flex-col flex-grow p-5 relative z-20 -mt-10 bg-gradient-to-b from-transparent to-[#09090b] via-[#09090b]/90">
                    <Link href={`/movies/${movie.imdbID}`} className="mb-2">
                      <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors drop-shadow-md">
                        {movie.title}
                      </h3>
                    </Link>
                    <p className="text-sm font-light text-white/50 mb-6">{movie.year}</p>
                    
                    <div className="mt-auto">
                      <Button 
                        variant="ghost" 
                        className="w-full gap-2 text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 rounded-xl transition-all duration-300"
                        disabled={removeMutation.isPending}
                        onClick={(e) => {
                          e.preventDefault();
                          if (confirm(`Remove "${movie.title}" from this watchlist?`)) {
                            removeMutation.mutate({ watchlistId: id, movieId: movie.imdbID });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="fade-in-up delay-200">
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function WatchlistDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <WatchlistDetailContent />
    </Suspense>
  );
}
