import { Watchlist } from "@/types";
import { WatchlistCard } from "./WatchlistCard";

interface WatchlistGridProps {
  watchlists: Watchlist[];
}

export function WatchlistGrid({ watchlists }: WatchlistGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in-50">
      {watchlists.map((watchlist) => (
        <WatchlistCard key={watchlist.id} watchlist={watchlist} />
      ))}
    </div>
  );
}
