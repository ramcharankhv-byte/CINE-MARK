import express from "express";
import dotenv from "dotenv";
import { secureHeaders } from "./config/security.js";
import { limiter } from "./middleware/rate-limiter.js";
import { httpLogger } from "./middleware/logger.middleware.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

import cookieParser from "cookie-parser";
import cors from "cors";

import authRouter from "./modules/auth/auth.routes.js";
import movieRouter from "./modules/movie/movie.route.js";
import watchlistRouter from "./modules/watchlist/watchlist.route.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

app.use(secureHeaders);
app.use(limiter);
app.use(httpLogger);

// Parse CORS_ORIGIN environment variable (comma-separated for multiple origins)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/watchlist", watchlistRouter);
app.use("/api/v1/movie", movieRouter);

app.use((err, req, res, next) => {
  return res.status(err.statusCode || 500).json({
    success: err.success || false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
  });
});

export default app;
