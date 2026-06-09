import { Router } from "express";

import { searchMovie, getMovie } from "./movie.controller.js";

import { verifyJwt } from "../auth/auth.middleware.js";

import { searchMovieSchema, movieParamsSchema } from "./movie.validator.js";

import { validate } from "../../middleware/validator.js";

const movieRouter = Router();

movieRouter.use(verifyJwt);

movieRouter
  .route("/search")
  .get(validate(searchMovieSchema, "query"), searchMovie);

movieRouter
  .route("/:imdbID")
  .get(validate(movieParamsSchema, "params"), getMovie);

export default movieRouter;
