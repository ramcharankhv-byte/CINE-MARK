import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <FileQuestion className="h-8 w-8 text-primary" />
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter">Page not found</h1>
        <p className="max-w-md text-muted-foreground">
          That page does not exist. It may have been moved or removed.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/watchlists"
          className={cn(buttonVariants({ size: "lg" }))}
        >
          My watchlists
        </Link>
        <Link
          href="/movies/search"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Search movies
        </Link>
      </div>
    </div>
  );
}
