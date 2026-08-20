import {
  deleteCachedWorkspaceMemberLists,
  getCachedWorkspaceMembers,
  setCachedWorkspaceMembers,
} from "../../../src/cache/workspace-members.cache.js";
import { getCacheRedisConnection } from "../../../src/config/cache.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    set: vi.fn(),
    sadd: vi.fn(),
    expire: vi.fn(),
    exec: vi.fn(),
  };
  const redis = {
    get: vi.fn(),
    del: vi.fn(),
    multi: vi.fn(),
    smembers: vi.fn(),
  };

  return { redis, transaction };
});

vi.mock("../../../src/config/cache.js", () => ({
  CACHE_VERSION: "v1",
  getCacheRedisConnection: vi.fn(() => mocks.redis),
}));

vi.mock("../../../src/config/env.js", () => ({
  env: { REDIS_CACHE_TTL_SECONDS: 60 },
}));

const cachedPage = {
  members: [
    {
      id: 1,
      firstname: "Workspace",
      lastname: "Owner",
      email: "owner@example.com",
      role: "OWNER" as const,
      joinedAt: "2026-08-20T00:00:00.000Z",
    },
  ],
  pagination: {
    page: 2,
    pageSize: 20,
    total: 21,
    totalPages: 2,
  },
};

describe("workspace member-list cache", () => {
  beforeEach(() => {
    mocks.transaction.set.mockReturnValue(mocks.transaction);
    mocks.transaction.sadd.mockReturnValue(mocks.transaction);
    mocks.transaction.expire.mockReturnValue(mocks.transaction);
    mocks.transaction.exec.mockResolvedValue([]);
    mocks.redis.multi.mockReturnValue(mocks.transaction);
    mocks.redis.del.mockResolvedValue(1);
  });

  it("reads the requested workspace page from its page-specific key", async () => {
    mocks.redis.get.mockResolvedValue(JSON.stringify(cachedPage));

    await expect(getCachedWorkspaceMembers(10, 2, 20)).resolves.toEqual(
      cachedPage,
    );
    expect(mocks.redis.get).toHaveBeenCalledWith(
      "workspace:members:v1:10:page:2:size:20",
    );
  });

  it("deletes malformed JSON and treats the page as a cache miss", async () => {
    mocks.redis.get.mockResolvedValue("not-json");

    await expect(getCachedWorkspaceMembers(10, 2, 20)).resolves.toBeNull();
    expect(mocks.redis.del).toHaveBeenCalledWith(
      "workspace:members:v1:10:page:2:size:20",
    );
  });

  it("falls back to a cache miss when Redis cannot be read", async () => {
    const redisError = new Error("Redis unavailable");
    mocks.redis.get.mockRejectedValue(redisError);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(getCachedWorkspaceMembers(10, 1, 20)).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "Unable to read workspace member-list cache",
      redisError,
    );
  });

  it("stores the page, registers its key, and expires both together", async () => {
    await setCachedWorkspaceMembers(10, cachedPage);

    const pageKey = "workspace:members:v1:10:page:2:size:20";
    const registryKey = "workspace:members:v1:10:keys";
    expect(getCacheRedisConnection).toHaveBeenCalled();
    expect(mocks.transaction.set).toHaveBeenCalledWith(
      pageKey,
      JSON.stringify(cachedPage),
      "EX",
      60,
    );
    expect(mocks.transaction.sadd).toHaveBeenCalledWith(registryKey, pageKey);
    expect(mocks.transaction.expire).toHaveBeenCalledWith(registryKey, 60);
    expect(mocks.transaction.exec).toHaveBeenCalledOnce();
  });

  it("deletes every registered page and the workspace registry", async () => {
    mocks.redis.smembers.mockResolvedValue([
      "workspace:members:v1:10:page:1:size:20",
      "workspace:members:v1:10:page:2:size:20",
    ]);

    await deleteCachedWorkspaceMemberLists(10);

    expect(mocks.redis.del).toHaveBeenCalledWith(
      "workspace:members:v1:10:page:1:size:20",
      "workspace:members:v1:10:page:2:size:20",
      "workspace:members:v1:10:keys",
    );
  });

  it("does not reject database workflows when cache deletion fails", async () => {
    const redisError = new Error("Redis unavailable");
    mocks.redis.smembers.mockRejectedValue(redisError);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(deleteCachedWorkspaceMemberLists(10)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      "Unable to delete workspace member-list cache",
      redisError,
    );
  });
});
