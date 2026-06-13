"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Watchlist } from "@/types";
import { MoreVertical, Trash2, ListVideo } from "lucide-react";
import Link from "next/link";
import { useDeleteWatchlist } from "@/lib/queries/hooks";

interface WatchlistCardProps {
  watchlist: Watchlist;
}

export function WatchlistCard({ watchlist }: WatchlistCardProps) {
  const deleteMutation = useDeleteWatchlist();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to watchlist
    if (confirm("Are you sure you want to delete this watchlist?")) {
      deleteMutation.mutate(watchlist.id);
    }
  };

  return (
    <Link href={`/watchlists/${watchlist.id}`} className="block h-full group fade-in-up">
      <div className="h-full flex flex-col relative rounded-3xl transition-all duration-500 hover:-translate-y-2">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-white/[0.01] rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 border border-white/10 group-hover:border-primary/50 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.05)]"></div>
        
        <div className="relative z-10 flex flex-col h-full p-6">
          <div className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1 pr-6">
              <h3 className="font-semibold text-xl tracking-tight line-clamp-1 group-hover:text-primary transition-colors text-white">
                {watchlist.name}
              </h3>
              <div className="flex items-center gap-2 mt-3">
                <Badge 
                  variant={watchlist.status === "COMPLETED" ? "default" : "secondary"}
                  className="bg-white/10 hover:bg-white/20 border-white/5 text-white/70 tracking-widest text-[10px] uppercase font-bold"
                >
                  {watchlist.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
            
            <div className="absolute right-4 top-4 z-20" onClick={(e) => e.preventDefault()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 rounded-full">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="bg-[#0c0c0e]/95 backdrop-blur-xl border-white/10 text-white rounded-xl">
                  <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Watchlist</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="mt-auto pt-6">
            <div className="flex items-center gap-3 text-sm text-white/40 font-light">
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                <ListVideo className="h-3.5 w-3.5" />
                <span>{watchlist._count?.movies || 0} items</span>
              </div>
              <span className="mx-1 opacity-50">•</span>
              <span>{new Date(watchlist.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
