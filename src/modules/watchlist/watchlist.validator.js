import { z } from "zod";

export const playlistIdSchema = z.uuid();

export const movieIdSchema = z.uuid();

export const createPlaylistSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export const addMovieSchema = z.object({
  id: movieIdSchema,
});

export const playlistParamsSchema = z.object({
  playlistId: z.uuid(),
});

export const movieParamsSchema = z.object({
  id: movieIdSchema,
});
