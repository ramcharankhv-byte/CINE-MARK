"use client";

import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";

export function GoogleLoginButton() {
  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/home`,
        }
      });
      if (error) throw error;
    } catch (error) {
      toast.error("Google Login Failed");
    }
  };

  return (
    <div className="flex justify-center">
      <button 
        onClick={handleLogin}
        className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded shadow hover:bg-gray-100 transition"
      >
        <FcGoogle size={24} />
        <span className="font-medium">Sign in with Google</span>
      </button>
    </div>
  );
}
