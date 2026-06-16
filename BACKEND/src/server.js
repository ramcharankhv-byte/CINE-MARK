import "dotenv/config";
import express from "express";

import app from "./app.js";

import { logger } from "./config/logger.js";

const requiredEnv = [
  "DATABASE_URL",
  "GOOGLE_CLIENT_ID",
  "JWT_SECRET",
  "API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

import { connectDB, disconnectDB, prisma } from "./config/db.js";

connectDB();

const port = process.env.PORT || 8080;

const server = app.listen(port, "0.0.0.0", () => {
  logger.info(`Server running on PORT ${port}`);
});

// Handle unhandled promise rejections (e.g., database connection errors)
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
  server.close(async () => {
    await disconnectDB();
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", async (err) => {
  logger.error("Uncaught Exception:", err);
  await disconnectDB();
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});
