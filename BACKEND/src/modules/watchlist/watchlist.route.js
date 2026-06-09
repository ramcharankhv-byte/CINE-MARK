import { Router } from "express";

import { verifyJwt } from "../auth/auth.middleware.js";

import { validate } from "../../middleware/validator.js";

import {
  createWatchList,
  addMovieToWatchlist,
  removeMovieFromWatchlist,
  getAllWatchlists,
  getWatchlist,
  searchWatchlists,
  deleteWatchlist,
} from "./watchlist.controller.js";

import {
  createPlaylistSchema,
  searchPlaylistSchema,
  playlistParamsSchema,
  watchlistMovieParamsSchema,
} from "./watchlist.validator.js";

const watchlistRouter = Router();

watchlistRouter.use(verifyJwt);

watchlistRouter
  .route("/")
  .get(getAllWatchlists)
  .post(validate(createPlaylistSchema, "body"), createWatchList);

watchlistRouter
  .route("/search")
  .get(validate(searchPlaylistSchema, "query"), searchWatchlists);

watchlistRouter
  .route("/:watchlistId")
  .get(validate(playlistParamsSchema, "params"), getWatchlist)
  .delete(validate(playlistParamsSchema, "params"), deleteWatchlist);

watchlistRouter
  .route("/:watchlistId/:movieId")
  .post(validate(watchlistMovieParamsSchema, "params"), addMovieToWatchlist)
  .delete(
    validate(watchlistMovieParamsSchema, "params"),
    removeMovieFromWatchlist,
  );

export default watchlistRouter;
