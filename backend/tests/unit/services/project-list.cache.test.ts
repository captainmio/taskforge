import {
  deleteCachedProjectList,
  getCachedProjectList,
  setCachedProjectList,
} from "../../../src/cache/project-list.cache.js";
import {
  CACHE_VERSION,
  getCacheRedisConnection,
} from "../../../src/config/cache.js";
import {
  ProjectDefaultView,
  ProjectIcon,
  ProjectStatus,
} from "../../../src/generated/prisma/enums.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("../../../src/config/cache.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/config/cache.js")>()),
  getCacheRedisConnection: vi.fn(() => mocks.redis),
}));

vi.mock("../../../src/config/env.js", () => ({
  env: { REDIS_CACHE_TTL_SECONDS: 60 },
}));

vi.mock("../../../src/config/logger.js", () => ({
  logger: { warn: vi.fn() },
}));

const projects = [{
  id: 25,
  name: "Website Redesign",
  description: "Refresh the marketing site.",
  icon: ProjectIcon.desktop,
  status: ProjectStatus.planning,
  startDate: "2026-09-01T00:00:00.000Z",
  dueDate: "2026-10-01T00:00:00.000Z",
  defaultView: ProjectDefaultView.board,
  createdAt: "2026-08-22T00:00:00.000Z",
}];

describe("project-list cache", () => {
  const cacheKey = `workspace:projects:${CACHE_VERSION}:10`;

  beforeEach(() => {
    mocks.redis.get.mockReset();
    mocks.redis.set.mockReset();
    mocks.redis.del.mockReset();
    mocks.redis.set.mockResolvedValue("OK");
    mocks.redis.del.mockResolvedValue(1);
  });

  it("reads project lists from the versioned workspace key", async () => {
    mocks.redis.get.mockResolvedValueOnce(JSON.stringify(projects));

    await expect(getCachedProjectList(10)).resolves.toEqual(projects);
    expect(mocks.redis.get).toHaveBeenCalledWith(cacheKey);
  });

  it("stores project lists with the configured TTL", async () => {
    await setCachedProjectList(10, projects);

    expect(getCacheRedisConnection).toHaveBeenCalled();
    expect(mocks.redis.set).toHaveBeenCalledWith(
      cacheKey,
      JSON.stringify(projects),
      "EX",
      60,
    );
  });

  it("deletes malformed cached data and treats it as a miss", async () => {
    mocks.redis.get.mockResolvedValueOnce("not-json");

    await expect(getCachedProjectList(10)).resolves.toBeNull();
    expect(mocks.redis.del).toHaveBeenCalledWith(cacheKey);
  });

  it("falls back safely when Redis operations fail", async () => {
    mocks.redis.get.mockRejectedValueOnce(new Error("Redis unavailable"));
    mocks.redis.set.mockRejectedValueOnce(new Error("Redis unavailable"));
    mocks.redis.del.mockRejectedValueOnce(new Error("Redis unavailable"));

    await expect(getCachedProjectList(10)).resolves.toBeNull();
    await expect(setCachedProjectList(10, projects)).resolves.toBeUndefined();
    await expect(deleteCachedProjectList(10)).resolves.toBeUndefined();
  });
});
