"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Landing route.
 *
 * Sends signed-in visitors to their watchlists and everyone else to login.
 * A spinner is rendered until the Supabase session has resolved, so neither
 * destination is briefly shown to the wrong person.
 */
export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/watchlists" : "/login");
  }, [user, isLoading, router]);

  return (
    <div className="flex h-[100dvh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
