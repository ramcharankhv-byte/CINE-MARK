import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Movie } from "@/types";
import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AddToWatchlistModal } from "@/components/watchlists/AddToWatchlistModal";
import { useState } from "react";

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  const initialPosterSrc =
    movie.poster && movie.poster !== "N/A"
      ? movie.poster
      : "/no-poster.svg";

  const [posterSrc, setPosterSrc] = useState(initialPosterSrc);

  return (
    <div className="group relative flex flex-col transition-all duration-300 hover:scale-[1.02]">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-lg ring-1 ring-white/10">
        <Link href={`/movies/${movie.imdbID}`} className="absolute inset-0 block h-full w-full">
          {posterSrc === "/no-poster.svg" ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/5 p-4 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-3">
                <svg className="h-6 w-6 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-muted-foreground">{movie.title}</span>
              <span className="mt-2 text-sm font-medium text-muted-foreground/50">{movie.year}</span>
            </div>
          ) : (
            <Image
              src={posterSrc}
              alt={`Poster for ${movie.title}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setPosterSrc("/no-poster.svg")}
            />
          )}
        </Link>
        
        {/* Floating gradient overlay that appears on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Rating Badge */}
        {movie.imdbRating && movie.imdbRating !== "N/A" && (
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/20">
            <span className="text-yellow-500">★</span> {movie.imdbRating}
          </div>
        )}

        {/* Action Button that slides up on hover */}
        <div className="absolute bottom-0 left-0 right-0 z-10 translate-y-full p-4 transition-transform duration-300 group-hover:translate-y-0">
          <AddToWatchlistModal movie={movie}>
            <Button variant="default" size="sm" className="w-full gap-2 rounded-full font-semibold shadow-xl">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </AddToWatchlistModal>
        </div>
      </div>

      <div className="mt-3 px-1">
        <h3 className="line-clamp-1 text-base font-medium tracking-tight hover:text-primary transition-colors">
          <Link href={`/movies/${movie.imdbID}`}>
            {movie.title}
          </Link>
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{movie.year}</span>
          {movie.genre && (
            <>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              <span className="line-clamp-1">{movie.genre.split(", ")[0]}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
