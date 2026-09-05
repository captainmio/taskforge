import {
  deleteCachedWorkspaceUpcomingTasks,
  getCachedWorkspaceUpcomingTasks,
  setCachedWorkspaceUpcomingTasks,
} from "../../../src/cache/workspace-upcoming-tasks.cache.js";
import {
  CACHE_VERSION,
  getCacheRedisConnection,
} from "../../../src/config/cache.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redis: {
    del: vi.fn(),
    get: vi.fn(),
    scan: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("../../../src/config/cache.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/config/cache.js")>()),
  getCacheRedisConnection: vi.fn(() => mocks.redis),
}));

vi.mock("../../../src/config/env.js", () => ({
  env: { REDIS_CACHE_TTL_SECONDS: 60 },
}));

const cachedPage = {
  tasks: [
    {
      id: 101,
      title: "Review launch checklist",
      description: "Confirm the final launch tasks.",
      status: "todo" as const,
      priority: "medium" as const,
      dueDate: "2026-09-18",
      timeEstimate: null,
      project: { id: 25, name: "Website Redesign" },
      assignees: [],
    },
  ],
  nextCursor: 101,
};

describe("workspace upcoming-tasks cache", () => {
  beforeEach(() => {
    mocks.redis.del.mockResolvedValue(1);
    mocks.redis.set.mockResolvedValue("OK");
    mocks.redis.scan.mockResolvedValue(["0", []]);
  });

  it("separates cached pages by member, cursor, and limit", async () => {
    mocks.redis.get.mockResolvedValue(JSON.stringify(cachedPage));

    await expect(getCachedWorkspaceUpcomingTasks(10, 7, 80, 5)).resolves.toEqual(
      cachedPage,
    );
    expect(mocks.redis.get).toHaveBeenCalledWith(
      `workspace:upcoming-tasks:${CACHE_VERSION}:10:7:80:5:due_asc`,
    );
  });

  it("stores the requested member's first page with its configured expiry", async () => {
    await setCachedWorkspaceUpcomingTasks(10, 7, undefined, 5, "due_asc", cachedPage);

    expect(getCacheRedisConnection).toHaveBeenCalled();
    expect(mocks.redis.set).toHaveBeenCalledWith(
      `workspace:upcoming-tasks:${CACHE_VERSION}:10:7:first:5:due_asc`,
      JSON.stringify(cachedPage),
      "EX",
      60,
    );
  });

  it("deletes every member and pagination variant for the workspace", async () => {
    const firstKey = `workspace:upcoming-tasks:${CACHE_VERSION}:10:7:first:5:due_asc`;
    const nextKey = `workspace:upcoming-tasks:${CACHE_VERSION}:10:8:101:25:priority`;
    mocks.redis.scan
      .mockResolvedValueOnce(["8", [firstKey]])
      .mockResolvedValueOnce(["0", [nextKey]]);

    await deleteCachedWorkspaceUpcomingTasks(10);

    expect(mocks.redis.scan).toHaveBeenNthCalledWith(
      1,
      "0",
      "MATCH",
      `workspace:upcoming-tasks:${CACHE_VERSION}:10:*`,
      "COUNT",
      100,
    );
    expect(mocks.redis.del).toHaveBeenCalledWith(firstKey);
    expect(mocks.redis.del).toHaveBeenCalledWith(nextKey);
  });
});
