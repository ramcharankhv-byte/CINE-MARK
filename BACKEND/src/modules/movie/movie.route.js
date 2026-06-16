import { Router } from "express";
import multer from "multer";

import { searchMovie, getMovie, transcribeMovieAudio } from "./movie.controller.js";

import { verifyJwt } from "../auth/auth.middleware.js";

import { searchMovieSchema, movieParamsSchema } from "./movie.validator.js";

import { validate } from "../../middleware/validator.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const movieRouter = Router();

movieRouter.use(verifyJwt);

movieRouter
  .route("/transcribe")
  .post(upload.single("file"), transcribeMovieAudio);

movieRouter
  .route("/search")
  .get(validate(searchMovieSchema, "query"), searchMovie);

movieRouter
  .route("/:imdbID")
  .get(validate(movieParamsSchema, "params"), getMovie);

export default movieRouter;
