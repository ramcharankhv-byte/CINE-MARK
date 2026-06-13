"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function MovieSearchForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const initialQuery = searchParams.get("query") || "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (searchTerm) {
        params.set("query", searchTerm);
        params.set("page", "1"); // Reset to page 1 on new search
      } else {
        params.delete("query");
      }
      
      // Update URL without full page reload if query changed
      if (searchTerm !== initialQuery) {
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, router, pathname, searchParams, initialQuery]);

  return (
    <div className="w-full max-w-3xl mx-auto relative mb-12 group transition-all duration-500 hover:-translate-y-1 focus-within:-translate-y-1 fade-in-up delay-100">
      {/* Subtle top edge glow */}
      <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-[24px] opacity-40 blur-[2px] transition duration-500 group-hover:opacity-80 group-focus-within:opacity-80"></div>
      
      <div className="relative bg-[#09090b]/80 backdrop-blur-3xl border border-white/10 rounded-[24px] p-2 flex items-center transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:border-white/20 group-hover:bg-[#0c0c0e]/90 group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)] group-focus-within:border-white/30 group-focus-within:bg-[#0c0c0e]/90 group-focus-within:shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)]">
        <div className="pl-4 pr-2">
          <Search className="h-6 w-6 text-white/40 group-focus-within:text-white transition-colors" />
        </div>
        <input
          type="text"
          className="w-full bg-transparent border-none outline-none text-white placeholder:text-white/30 text-xl font-light px-2 py-4 tracking-wide"
          placeholder="Search for movies, series, episodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="pr-3">
          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs font-semibold tracking-widest backdrop-blur-md uppercase">
            OMDB
          </div>
        </div>
      </div>
    </div>
  );
}
