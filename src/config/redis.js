import { Redis } from "@upstash/redis";
import "dotenv/config";

// The SDK automatically loads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from .env
export const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Note: @upstash/redis does not use .connect() or .on("error").
// It communicates over HTTP instantly when you make a query.
console.log("Upstash Redis Client Initialised");
