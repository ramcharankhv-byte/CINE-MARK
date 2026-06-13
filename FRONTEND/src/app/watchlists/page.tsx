"use client";

import { useWatchlists } from "@/lib/queries/hooks";
import { WatchlistGrid } from "@/components/watchlists/WatchlistGrid";
import { WatchlistForm } from "@/components/watchlists/WatchlistForm";
import { Pagination } from "@/components/common/Pagination";
import { WatchlistGridSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ListVideo, AlertCircle } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";

function WatchlistsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 12;

  const { data, isLoading, isError, error } = useWatchlists(page, limit);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto w-full px-6 relative z-10 pb-12">
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

      <div className="flex flex-col items-center text-center pt-16 pb-6 fade-in-up">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground mb-4 leading-[1.1]">
          My <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary/80 to-purple-400 font-light italic pr-2">Watchlists</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl font-light">
          Manage your custom movie collections and track what you've seen.
        </p>
      </div>

      <div className="fade-in-up delay-100">
        <WatchlistForm />
      </div>

      {isLoading ? (
        <div className="mt-8">
          <WatchlistGridSkeleton />
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertCircle}
          title="Failed to load watchlists"
          description={(error as any)?.message || "Something went wrong."}
        />
      ) : data?.watchlists && data.watchlists.length > 0 ? (
        <div className="mt-8">
          <WatchlistGrid watchlists={data.watchlists} />
          <Pagination
            currentPage={page}
            totalPages={data.meta.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      ) : (
        <EmptyState
          icon={ListVideo}
          title="No watchlists yet"
          description="Create your first watchlist above to start organizing movies."
        />
      )}
    </div>
  );
}

export default function WatchlistsPage() {
  return (
    <Suspense fallback={<WatchlistGridSkeleton />}>
      <WatchlistsContent />
    </Suspense>
  );
}
