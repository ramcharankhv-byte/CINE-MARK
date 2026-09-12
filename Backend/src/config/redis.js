import { Redis } from "@upstash/redis";

import { logger } from "./logger.js";

/**
 * Upstash Redis client, created on first use.
 *
 * This used to be constructed at module scope, which meant that importing the
 * app with no environment loaded threw a raw stack trace from deep inside the
 * SDK before server.js could run its own required-variable check. Building it
 * lazily lets that check report the missing variable by name instead.
 *
 * @upstash/redis speaks HTTP, so there is no connection to open and no error
 * event to subscribe to.
 */
let client = null;

export const getRedis = () => {
  if (client) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Upstash Redis is not configured: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required",
    );
  }

  client = new Redis({ url, token });
  logger.info("Upstash Redis client initialised");

  return client;
};
