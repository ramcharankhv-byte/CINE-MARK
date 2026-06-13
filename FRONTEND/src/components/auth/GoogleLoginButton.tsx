"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function GoogleLoginButton() {
  const { login } = useAuth();
  const router = useRouter();

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          if (credentialResponse.credential) {
            try {
              await login(credentialResponse.credential);
              toast.success("Successfully logged in");
              router.push("/dashboard");
            } catch (error) {
              toast.error("Login failed. Please try again.");
            }
          }
        }}
        onError={() => {
          toast.error("Google Login Failed");
        }}
        useOneTap
      />
    </div>
  );
}
