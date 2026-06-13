"use client";

import { useMovieSearch } from "@/lib/queries/hooks";
import { MovieSearchForm } from "@/components/movies/MovieSearchForm";
import { MovieGrid } from "@/components/movies/MovieGrid";
import { Pagination } from "@/components/common/Pagination";
import { MovieGridSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { SearchX, Film } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const query = searchParams.get("query") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const { data, isLoading, isError, error } = useMovieSearch(query, page);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full px-6 relative z-10">
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
        .delay-150 { animation-delay: 150ms; }
        .delay-200 { animation-delay: 200ms; }
      `}</style>
      <div className="flex flex-col items-center text-center mt-12 mb-12 fade-in-up">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground mb-4 leading-[1.1]">
          Deep <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary/80 to-purple-400 font-light italic pr-2">Search</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl font-light">
          Search the complete OMDB database. Build your ultimate watchlists.
        </p>
      </div>

      <MovieSearchForm />

      {!query ? (
        <EmptyState
          icon={Film}
          title="Search the OMDB Database"
          description="Type a movie title above to start searching."
        />
      ) : isLoading ? (
        <MovieGridSkeleton />
      ) : isError ? (
        <EmptyState
          icon={SearchX}
          title="Error searching movies"
          description={(error as any)?.message || "Something went wrong."}
        />
      ) : data?.movies && data.movies.length > 0 ? (
        <>
        <div className="animate-in fade-in duration-500 delay-150">
          <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
            <h2 className="text-xl font-semibold tracking-tight">Search Results</h2>
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
              {data.meta.totalResults} movies found
            </div>
          </div>
          <MovieGrid movies={data.movies} />
          <Pagination
            currentPage={page}
            totalPages={data.meta.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
        </>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No movies found"
          description={`We couldn't find any movies matching "${query}".`}
        />
      )}
    </div>
  );
}

export default function MovieSearchPage() {
  return (
    <Suspense fallback={<MovieGridSkeleton />}>
      <SearchContent />
    </Suspense>
  );
}
