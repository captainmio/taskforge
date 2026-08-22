import {
  getCachedWorkspaceOverview,
  setCachedWorkspaceOverview,
} from "../../../src/cache/workspace-overview.cache.js";
import {
  CACHE_VERSION,
  getCacheRedisConnection,
} from "../../../src/config/cache.js";
import { WorkspaceIcon, WorkspaceRole } from "../../../src/generated/prisma/enums.js";
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

const cachedOverview = {
  id: 10,
  displayName: "Engineering Team",
  description: "Builds and maintains the product.",
  icon: WorkspaceIcon.code,
  createdAt: "2026-08-18T00:00:00.000Z",
  members: [
    {
      id: 8,
      firstname: "Workspace",
      lastname: "Member",
      email: "member@example.com",
      role: WorkspaceRole.MEMBER,
      joinedAt: "2026-08-20T00:00:00.000Z",
    },
  ],
};

describe("workspace overview cache", () => {
  beforeEach(() => {
    mocks.redis.del.mockResolvedValue(1);
    mocks.redis.set.mockResolvedValue("OK");
  });

  it("reads the complete overview from the shared cache version", async () => {
    mocks.redis.get.mockResolvedValue(JSON.stringify(cachedOverview));

    await expect(getCachedWorkspaceOverview(10)).resolves.toEqual(
      cachedOverview,
    );
    expect(mocks.redis.get).toHaveBeenCalledWith(
      `workspace:overview:${CACHE_VERSION}:10`,
    );
  });

  it("stores the complete overview under the shared cache version", async () => {
    await setCachedWorkspaceOverview(10, cachedOverview);

    expect(getCacheRedisConnection).toHaveBeenCalled();
    expect(mocks.redis.set).toHaveBeenCalledWith(
      `workspace:overview:${CACHE_VERSION}:10`,
      JSON.stringify(cachedOverview),
      "EX",
      60,
    );
  });

  it("deletes malformed JSON and treats it as a cache miss", async () => {
    mocks.redis.get.mockResolvedValue("not-json");

    await expect(getCachedWorkspaceOverview(10)).resolves.toBeNull();
    expect(mocks.redis.del).toHaveBeenCalledWith(
      `workspace:overview:${CACHE_VERSION}:10`,
    );
  });
});
