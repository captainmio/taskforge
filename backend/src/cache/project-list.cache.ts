import {
  CACHE_VERSION,
  getCacheRedisConnection,
} from "../config/cache.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import type {
  ProjectDefaultView,
  ProjectIcon,
  ProjectStatus,
} from "../generated/prisma/enums.js";

export interface ProjectListItem {
  id: number;
  name: string;
  description: string;
  icon: ProjectIcon;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  defaultView: ProjectDefaultView;
  createdAt: string;
}

const getProjectListCacheKey = (workspaceId: number): string =>
  `workspace:projects:${CACHE_VERSION}:${workspaceId}`;

export const getCachedProjectList = async (
  workspaceId: number,
): Promise<ProjectListItem[] | null> => {
  const redis = getCacheRedisConnection();
  const key = getProjectListCacheKey(workspaceId);

  try {
    const cachedValue = await redis.get(key);
    if (!cachedValue) return null;

    try {
      return JSON.parse(cachedValue) as ProjectListItem[];
    } catch {
      await redis.del(key);
      return null;
    }
  } catch (error) {
    logger.warn(
      { logType: "system", event: "project_list_cache_read_failed", err: error, workspaceId },
      "[SYSTEM] Unable to read project-list cache",
    );
    return null;
  }
};

export const setCachedProjectList = async (
  workspaceId: number,
  projects: ProjectListItem[],
): Promise<void> => {
  try {
    await getCacheRedisConnection().set(
      getProjectListCacheKey(workspaceId),
      JSON.stringify(projects),
      "EX",
      env.REDIS_CACHE_TTL_SECONDS,
    );
  } catch (error) {
    logger.warn(
      { logType: "system", event: "project_list_cache_write_failed", err: error, workspaceId },
      "[SYSTEM] Unable to write project-list cache",
    );
  }
};

export const deleteCachedProjectList = async (
  workspaceId: number,
): Promise<void> => {
  try {
    await getCacheRedisConnection().del(getProjectListCacheKey(workspaceId));
  } catch (error) {
    // Database writes remain successful when Redis is unavailable; a stale
    // list expires normally if its entry cannot be removed immediately.
    logger.warn(
      { logType: "system", event: "project_list_cache_delete_failed", err: error, workspaceId },
      "[SYSTEM] Unable to delete project-list cache",
    );
  }
};
