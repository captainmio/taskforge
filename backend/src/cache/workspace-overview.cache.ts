import {
  CACHE_VERSION,
  getCacheRedisConnection,
} from "../config/cache.js";
import { env } from "../config/env.js";
import type { WorkspaceRole } from "../generated/prisma/enums.js";

export interface WorkspaceOverviewMember {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export type WorkspaceOverviewData = WorkspaceOverviewMember[];

// The version segment lets a future response-shape change use a new namespace
// instead of interpreting older cached records as the new format.
const getWorkspaceOverviewCacheKey = (workspaceId: number): string =>
  `workspace:overview:${CACHE_VERSION}:${workspaceId}`;

export const getCachedWorkspaceOverview = async (
  workspaceId: number,
): Promise<WorkspaceOverviewData | null> => {
  const redis = getCacheRedisConnection();
  const key = getWorkspaceOverviewCacheKey(workspaceId);

  try {
    const cachedValue = await redis.get(key);
    if (!cachedValue) return null;

    try {
      return JSON.parse(cachedValue) as WorkspaceOverviewData;
    } catch {
      // Remove malformed entries so every subsequent request does not repeat the
      // same parsing failure until the TTL expires.
      await redis.del(key);
      return null;
    }
  } catch (error) {
    // Cache availability must not prevent an authorized request from falling
    // back to the database through the service's cache-aside flow.
    // console.error("Unable to read workspace overview cache", error);
    return null;
  }
};

export const setCachedWorkspaceOverview = async (
  workspaceId: number,
  overview: WorkspaceOverviewData,
): Promise<void> => {
  try {
    await getCacheRedisConnection().set(
      getWorkspaceOverviewCacheKey(workspaceId),
      JSON.stringify(overview),
      "EX",
      env.REDIS_CACHE_TTL_SECONDS,
    );
  } catch (error) {
    // Cache writes are best-effort; the database result remains valid even when
    // Redis is temporarily unavailable.
    console.error("Unable to write workspace overview cache", error);
  }
};
