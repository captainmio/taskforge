import {
  CACHE_VERSION,
  getCacheRedisConnection,
} from "../config/cache.js";
import { env } from "../config/env.js";
import type { WorkspaceOverviewMember } from "./workspace-overview.cache.js";

export interface WorkspaceMemberListData {
  members: WorkspaceOverviewMember[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const getWorkspaceMembersCacheKey = (
  workspaceId: number,
  page: number,
  pageSize: number,
): string =>
  `workspace:members:${CACHE_VERSION}:${workspaceId}:page:${page}:size:${pageSize}`;

const getWorkspaceMembersRegistryKey = (workspaceId: number): string =>
  `workspace:members:${CACHE_VERSION}:${workspaceId}:keys`;

export const getCachedWorkspaceMembers = async (
  workspaceId: number,
  page: number,
  pageSize: number,
): Promise<WorkspaceMemberListData | null> => {
  try {
    const cachedValue = await getCacheRedisConnection().get(
      getWorkspaceMembersCacheKey(workspaceId, page, pageSize),
    );
    if (!cachedValue) return null;

    try {
      return JSON.parse(cachedValue) as WorkspaceMemberListData;
    } catch {
      // A malformed page must not be returned repeatedly. Removing only this
      // page leaves other valid cached pages available until their normal expiry.
      await getCacheRedisConnection().del(
        getWorkspaceMembersCacheKey(workspaceId, page, pageSize),
      );
      return null;
    }
  } catch (error) {
    // Member listing remains available through PostgreSQL when Redis is down.
    console.error("Unable to read workspace member-list cache", error);
    return null;
  }
};

export const setCachedWorkspaceMembers = async (
  workspaceId: number,
  data: WorkspaceMemberListData,
): Promise<void> => {
  const redis = getCacheRedisConnection();
  const pageKey = getWorkspaceMembersCacheKey(
    workspaceId,
    data.pagination.page,
    data.pagination.pageSize,
  );
  const registryKey = getWorkspaceMembersRegistryKey(workspaceId);

  try {
    // Record every page key in a workspace-specific set. The registry lets a
    // membership change remove all cached pages without scanning unrelated keys.
    await redis
      .multi()
      .set(
        pageKey,
        JSON.stringify(data),
        "EX",
        env.REDIS_CACHE_TTL_SECONDS,
      )
      .sadd(registryKey, pageKey)
      .expire(registryKey, env.REDIS_CACHE_TTL_SECONDS)
      .exec();
  } catch (error) {
    console.error("Unable to write workspace member-list cache", error);
  }
};

export const deleteCachedWorkspaceMemberLists = async (
  workspaceId: number,
): Promise<void> => {
  const redis = getCacheRedisConnection();
  const registryKey = getWorkspaceMembersRegistryKey(workspaceId);

  try {
    const pageKeys = await redis.smembers(registryKey);

    // Delete every registered page together with the registry. Redis DEL ignores
    // page keys that have already expired, so this is safe for partially expired sets.
    await redis.del(...pageKeys, registryKey);
  } catch (error) {
    // Database writes must remain successful if cache cleanup is unavailable.
    // Any page that could not be deleted will still expire through its short TTL.
    console.error("Unable to delete workspace member-list cache", error);
  }
};
