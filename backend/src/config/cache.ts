import IORedis from "ioredis";
import { env } from "./env.js";

// Bump this whenever a cached data contract changes. This keeps clients from
// receiving older Redis entries that do not include newly added fields.
export const CACHE_VERSION = "v5";

let cacheRedisConnection: IORedis | undefined;

export const getCacheRedisConnection = (): IORedis => {
  if (!cacheRedisConnection) {
    cacheRedisConnection = new IORedis(env.CACHE_REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    cacheRedisConnection.on("error", (error) => {
      console.error("Cache Redis connection error", error);
    });
  }

  return cacheRedisConnection;
};

export const closeCacheRedisConnection = (): void => {
  cacheRedisConnection?.disconnect();
  cacheRedisConnection = undefined;
};
