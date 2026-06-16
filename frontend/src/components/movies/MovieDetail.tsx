import { Movie } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, Clock, Calendar, Plus } from "lucide-react";
import Image from "next/image";
import { AddToWatchlistModal } from "@/components/watchlists/AddToWatchlistModal";
import { useState } from "react";

export function MovieDetail({ movie }: { movie: Movie }) {
  const initialPosterSrc =
    movie.poster && movie.poster !== "N/A"
      ? movie.poster
      : "/no-poster.svg";

  const [posterSrc, setPosterSrc] = useState(initialPosterSrc);

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_2fr] lg:grid-cols-[1fr_3fr] animate-in fade-in-50">
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
          {posterSrc === "/no-poster.svg" ? (
            <div className="flex h-full min-h-[500px] w-full flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/5 p-6 text-center">
              <div className="mb-6 rounded-full bg-primary/10 p-4">
                <svg className="h-10 w-10 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <span className="text-3xl font-bold tracking-tight text-muted-foreground">{movie.title}</span>
              <span className="mt-3 text-lg font-medium text-muted-foreground/50">{movie.year}</span>
            </div>
          ) : (
            <Image
              src={posterSrc}
              alt={movie.title}
              width={600}
              height={900}
              priority
              className="w-full h-auto object-cover aspect-[2/3]"
              onError={() => setPosterSrc("/no-poster.svg")}
            />
          )}
        </div>
        <AddToWatchlistModal movie={movie}>
          <Button size="lg" className="w-full gap-2">
            <Plus className="h-5 w-5" /> Add to Watchlist
          </Button>
        </AddToWatchlistModal>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {movie.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {movie.imdbRating && movie.imdbRating !== "N/A" && (
              <Badge variant="secondary" className="gap-1 px-2 py-1 text-base">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                {movie.imdbRating}
              </Badge>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{movie.year}</span>
            </div>
            {movie.country && movie.country !== "N/A" && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <span>{movie.country}</span>
              </>
            )}
          </div>
        </div>

        {movie.genre && movie.genre !== "N/A" && (
          <div className="flex flex-wrap gap-2">
            {movie.genre.split(", ").map((g) => (
              <Badge key={g} variant="outline" className="text-sm">
                {g}
              </Badge>
            ))}
          </div>
        )}

        {movie.plot && movie.plot !== "N/A" && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Plot</h2>
            <p className="leading-relaxed text-muted-foreground">{movie.plot}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {movie.director && movie.director !== "N/A" && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Director</h3>
                <p className="font-medium">{movie.director}</p>
              </CardContent>
            </Card>
          )}
          {movie.writer && movie.writer !== "N/A" && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Writer</h3>
                <p className="font-medium">{movie.writer}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {movie.actors && movie.actors !== "N/A" && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Cast</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {movie.actors.split(", ").map((actor) => (
                <Card key={actor}>
                  <CardContent className="p-4 text-center flex flex-col items-center justify-center min-h-[80px]">
                    <span className="font-medium text-sm">{actor}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
