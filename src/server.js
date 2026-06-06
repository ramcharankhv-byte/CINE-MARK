import express from "express";
import dotenv from "dotenv";

import app from "./app.js";

dotenv.config();

import { connectDB, disconnectDB, prisma } from "./config/db.js";

connectDB();

const port = process.env.PORT;

const server = app.listen(port || 5001, "0.0.0.0", () => {
  console.log(`Server running on PORT ${port}`);
});

// Handle unhandled promise rejections (e.g., database connection errors)
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(async () => {
    await disconnectDB();
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);
  await disconnectDB();
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});
