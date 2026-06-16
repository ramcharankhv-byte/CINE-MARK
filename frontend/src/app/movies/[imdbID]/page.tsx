"use client";

import { useMovieDetail } from "@/lib/queries/hooks";
import { MovieDetail } from "@/components/movies/MovieDetail";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader2, Film } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const imdbID = params.imdbID as string;

  const { data: movie, isLoading, isError } = useMovieDetail(imdbID);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Button
        variant="ghost"
        className="mb-2 -ml-4 text-muted-foreground hover:text-foreground"
        onClick={() => router.back()}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to search
      </Button>

      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError || !movie ? (
        <EmptyState
          icon={Film}
          title="Movie Not Found"
          description="We couldn't load the details for this movie."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      ) : (
        <MovieDetail movie={movie} />
      )}
    </div>
  );
}
