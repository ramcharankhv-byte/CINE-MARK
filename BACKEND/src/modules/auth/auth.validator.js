import { z } from "zod";

export const userIdSchema = z.uuid();

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID Token is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});
