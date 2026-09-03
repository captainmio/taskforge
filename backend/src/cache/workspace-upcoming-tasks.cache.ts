import { CACHE_VERSION, getCacheRedisConnection } from "../config/cache.js";
import { env } from "../config/env.js";

export interface WorkspaceUpcomingTaskData {
  tasks: Array<{
    id: number;
    title: string;
    dueDate: string;
    project: { id: number; name: string };
  }>;
  nextCursor: number | null;
}

const getWorkspaceUpcomingTasksCacheKey = (
  workspaceId: number,
  userId: number,
  cursor: number | undefined,
  limit: number,
) =>
  `workspace:upcoming-tasks:${CACHE_VERSION}:${workspaceId}:${userId}:${cursor ?? "first"}:${limit}`;

export const getCachedWorkspaceUpcomingTasks = async (
  workspaceId: number,
  userId: number,
  cursor: number | undefined,
  limit: number,
): Promise<WorkspaceUpcomingTaskData | null> => {
  try {
    const cachedValue = await getCacheRedisConnection().get(
      getWorkspaceUpcomingTasksCacheKey(workspaceId, userId, cursor, limit),
    );
    if (!cachedValue) return null;

    try {
      return JSON.parse(cachedValue) as WorkspaceUpcomingTaskData;
    } catch {
      await getCacheRedisConnection().del(
        getWorkspaceUpcomingTasksCacheKey(workspaceId, userId, cursor, limit),
      );
      return null;
    }
  } catch {
    return null;
  }
};

export const setCachedWorkspaceUpcomingTasks = async (
  workspaceId: number,
  userId: number,
  cursor: number | undefined,
  limit: number,
  data: WorkspaceUpcomingTaskData,
): Promise<void> => {
  try {
    await getCacheRedisConnection().set(
      getWorkspaceUpcomingTasksCacheKey(workspaceId, userId, cursor, limit),
      JSON.stringify(data),
      "EX",
      env.REDIS_CACHE_TTL_SECONDS,
    );
  } catch {
    // Cache writes are best-effort; callers still receive the database result.
  }
};

export const deleteCachedWorkspaceUpcomingTasks = async (
  workspaceId: number,
): Promise<void> => {
  const redis = getCacheRedisConnection();
  const pattern = `workspace:upcoming-tasks:${CACHE_VERSION}:${workspaceId}:*`;
  let cursor = "0";

  try {
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      if (keys.length > 0) await redis.del(...keys);
      cursor = nextCursor;
    } while (cursor !== "0");
  } catch {
    // The TTL remains the fallback if Redis cannot invalidate this namespace.
  }
};
