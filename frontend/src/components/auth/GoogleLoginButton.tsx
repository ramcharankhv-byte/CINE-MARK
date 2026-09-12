"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";

export function GoogleLoginButton() {
  const [pending, setPending] = useState(false);

  const handleLogin = async () => {
    setPending(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        // Return to the site root, which is the Supabase project's Site URL and
        // is therefore always an allowed redirect. The root page completes the
        // code exchange and forwards to the watchlists. Pointing this at a
        // deeper path requires adding that path to Supabase's redirect allow
        // list, and fails silently back to here if you forget.
        options: { redirectTo: `${window.location.origin}/` },
      });

      if (error) throw error;
    } catch (error) {
      // Surface the real reason. A generic message here hid a provider
      // misconfiguration for a long time.
      const message =
        error instanceof Error ? error.message : "Google login failed";
      console.error("Google sign-in failed:", error);
      toast.error(message);
      setPending(false);
    }
  };

  return (
    <div className="flex justify-center">
      <button
        onClick={handleLogin}
        disabled={pending}
        className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded shadow hover:bg-gray-100 transition disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <FcGoogle size={24} />
        )}
        <span className="font-medium">
          {pending ? "Redirecting…" : "Sign in with Google"}
        </span>
      </button>
    </div>
  );
}
