import { asyncHandler } from "../../utils/asynchandler.js";
import { ApiResponse } from "../../utils/api-response.js";

import * as watchlistService from "./watchlist.services.js";

export const createWatchList = asyncHandler(async (req, res) => {
  const watchlist = await watchlistService.createWatchlist(
    req.body.name,
    req.user.id,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, watchlist, "Watchlist created"));
});

export const addMovieToWatchlist = asyncHandler(async (req, res) => {
  const { watchlistId, movieId } = req.params;

  await watchlistService.addMovieToWatchlist(watchlistId, movieId, req.user.id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Movie added to watchlist"));
});

export const removeMovieFromWatchlist = asyncHandler(async (req, res) => {
  const { watchlistId, movieId } = req.params;

  await watchlistService.removeMovieFromWatchlist(
    watchlistId,
    movieId,
    req.user.id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Movie removed from watchlist"));
});

export const getAllWatchlists = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const watchlists = await watchlistService.getAllWatchlists(
    req.user.id,
    page,
    limit,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, watchlists, "Watchlists fetched successfully"));
});

export const getWatchlist = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const { watchlistId } = req.params;

  const watchlist = await watchlistService.getWatchlist(
    watchlistId,
    req.user.id,
    page,
    limit,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, watchlist, "Watchlist fetched successfully"));
});

export const searchWatchlists = asyncHandler(async (req, res) => {
  const { query } = req.query;

  const watchlists = await watchlistService.searchWatchlists(
    query,
    req.user.id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, watchlists, "Watchlists fetched successfully"));
});

export const deleteWatchlist = asyncHandler(async (req, res) => {
  const { watchlistId } = req.params;

  await watchlistService.deleteWatchlist(watchlistId, req.user.id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Watchlist deleted successfully"));
});
