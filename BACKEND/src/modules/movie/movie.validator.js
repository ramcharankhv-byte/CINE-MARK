import { z } from "zod";

export const imdbIdSchema = z.string().regex(/^tt\d+$/);

export const searchMovieSchema = z.object({
  query: z.string().trim().min(1).max(100),
});

export const movieDetailsSchema = z.object({
  imdbID: imdbIdSchema,
});

export const movieParamsSchema = z.object({
  imdbID: imdbIdSchema,
});
