"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Landing route, and the OAuth return target.
 *
 * Google sends the browser back to Supabase, which sends it here with a
 * ?code= parameter. supabase-js exchanges that code for a session during
 * client initialisation, but the exchange is asynchronous, so anything that
 * redirects on "no user yet" will strip the code from the URL and the sign-in
 * silently fails back to the login page.
 *
 * This page therefore waits for the session itself rather than trusting a
 * loading flag, retries the exchange explicitly if the automatic one did not
 * run, and surfaces any error Google or Supabase returned instead of
 * swallowing it.
 */
export default function RootPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );

      // Google and Supabase report failures as query or hash parameters.
      const failure =
        search.get("error_description") ??
        hash.get("error_description") ??
        search.get("error") ??
        hash.get("error");

      if (failure) {
        if (!cancelled) setError(failure);
        return;
      }

      let { data } = await supabase.auth.getSession();

      // If detectSessionInUrl has not completed, finish the exchange here.
      // This overload takes the bare auth code, not the whole URL.
      const code = search.get("code");
      if (!data.session && code) {
        const exchange = await supabase.auth.exchangeCodeForSession(code);
        if (exchange.error) {
          if (!cancelled) setError(exchange.error.message);
          return;
        }
        data = { session: exchange.data.session };
      }

      if (cancelled) return;

      // Drop the auth parameters so a refresh does not retry a spent code.
      if (search.has("code")) {
        window.history.replaceState({}, "", "/");
      }

      router.replace(data.session ? "/watchlists" : "/login");
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Sign-in failed
          </h1>
          <p className="max-w-md text-muted-foreground">{error}</p>
        </div>
        <Link href="/login" className={cn(buttonVariants())}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="sr-only">Signing you in</span>
    </div>
  );
}
