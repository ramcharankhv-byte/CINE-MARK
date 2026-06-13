"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWatchlists, useAddMovieToWatchlist } from "@/lib/queries/hooks";
import { Movie } from "@/types";
import { Loader2, Plus } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AddToWatchlistModal({ movie, children }: { movie: Movie; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>("");

  // Get first page of watchlists to show in modal (limit 50 to avoid pagination here for now)
  const { data: watchlistsData, isLoading } = useWatchlists(1, 50);
  const addMutation = useAddMovieToWatchlist();

  const handleAdd = () => {
    if (!selectedWatchlist) return;
    addMutation.mutate(
      { watchlistId: selectedWatchlist, movieId: movie.imdbID },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedWatchlist("");
        },
      }
    );
  };

  const watchlists = watchlistsData?.watchlists || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
          <DialogDescription>
            Select a watchlist to add "{movie.title}" to.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : watchlists.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            You don't have any watchlists yet. Create one from the Dashboard!
          </div>
        ) : (
          <ScrollArea className="max-h-[300px] py-4">
            <RadioGroup value={selectedWatchlist} onValueChange={setSelectedWatchlist}>
              <div className="space-y-3">
                {watchlists.map((wl) => (
                  <div key={wl.id} className="flex items-center space-x-3">
                    <RadioGroupItem value={wl.id} id={`r-${wl.id}`} />
                    <Label htmlFor={`r-${wl.id}`} className="font-normal cursor-pointer flex-1">
                      {wl.name}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selectedWatchlist || addMutation.isPending}
            onClick={handleAdd}
          >
            {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
