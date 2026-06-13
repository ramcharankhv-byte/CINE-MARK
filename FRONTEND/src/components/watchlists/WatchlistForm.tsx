"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateWatchlist } from "@/lib/queries/hooks";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function WatchlistForm() {
  const [name, setName] = useState("");
  const createMutation = useCreateWatchlist();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createMutation.mutate(name, {
      onSuccess: () => {
        setName("");
      },
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative mb-12 group transition-all duration-500 hover:-translate-y-1 focus-within:-translate-y-1">
      {/* Subtle top edge glow */}
      <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-[24px] opacity-40 blur-[2px] transition duration-500 group-hover:opacity-80 group-focus-within:opacity-80"></div>
      
      <div className="relative bg-[#09090b]/80 backdrop-blur-3xl border border-white/10 rounded-[24px] p-2 flex items-center transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:border-white/20 group-hover:bg-[#0c0c0e]/90 group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)] group-focus-within:border-white/30 group-focus-within:bg-[#0c0c0e]/90 group-focus-within:shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)]">
        <div className="pl-4 pr-2">
          <Plus className="h-6 w-6 text-white/40 group-focus-within:text-white transition-colors" />
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
          <input
            type="text"
            className="w-full bg-transparent border-none outline-none text-white placeholder:text-white/30 text-xl font-light px-2 py-4 tracking-wide"
            placeholder="Name your new watchlist (e.g. Action Movies 2024)..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="pr-2 pl-2">
            <Button 
              type="submit" 
              disabled={!name.trim() || createMutation.isPending}
              className="rounded-xl bg-white text-black hover:bg-white/90 h-10 px-6 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
