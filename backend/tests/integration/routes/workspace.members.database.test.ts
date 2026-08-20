import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCachedWorkspaceMembers,
  setCachedWorkspaceMembers,
} from "../../../src/cache/workspace-members.cache.js";
import { JWT_SECRET } from "../../../src/config/auth.js";
import { prisma } from "../../../src/config/database.js";
import {
  WorkspaceIcon,
  WorkspaceRole,
} from "../../../src/generated/prisma/enums.js";
import { clearTestDatabase } from "../../helpers/database.js";

vi.mock("../../../src/cache/workspace-members.cache.js", () => ({
  deleteCachedWorkspaceMemberLists: vi.fn(),
  getCachedWorkspaceMembers: vi.fn(),
  setCachedWorkspaceMembers: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const createWorkspaceWithMembers = async (additionalMemberCount: number) => {
  const owner = await prisma.user.create({
    data: {
      email: "owner@example.com",
      firstname: "Workspace",
      lastname: "Owner",
      password: "hashed-password",
    },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: "engineering team",
      displayName: "Engineering Team",
      description: "Builds and maintains the product.",
      icon: WorkspaceIcon.code,
      ownerId: owner.id,
      members: {
        create: {
          userId: owner.id,
          role: WorkspaceRole.OWNER,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      },
    },
  });

  await prisma.user.createMany({
    data: Array.from({ length: additionalMemberCount }, (_, index) => ({
      email: `member-${index + 1}@example.com`,
      firstname: "Workspace",
      lastname: `Member ${index + 1}`,
      password: "hashed-password",
    })),
  });
  const members = await prisma.user.findMany({
    where: { email: { startsWith: "member-" } },
    orderBy: { id: "asc" },
  });
  await prisma.workspaceMember.createMany({
    data: members.map((member, index) => ({
      workspaceId: workspace.id,
      userId: member.id,
      role: index === 0 ? WorkspaceRole.ADMIN : WorkspaceRole.MEMBER,
      // Explicit timestamps make the repository's stable pagination order
      // deterministic even on databases that save a batch in one instant.
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index + 1)),
    })),
  });

  const authCookie = `accessToken=${jwt.sign(
    { sub: owner.id, email: owner.email },
    JWT_SECRET,
  )}`;

  return { owner, workspace, authCookie };
};

describe("GET /api/workspaces/:workspaceId/members with PostgreSQL", () => {
  beforeEach(async () => {
    vi.mocked(getCachedWorkspaceMembers).mockResolvedValue(null);
    vi.mocked(setCachedWorkspaceMembers).mockResolvedValue(undefined);
    await clearTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns stable non-overlapping pages with at most 20 members by default", async () => {
    const { owner, workspace, authCookie } =
      await createWorkspaceWithMembers(25);

    const firstPage = await request(app)
      .get(`/api/workspaces/${workspace.id}/members`)
      .set("Cookie", authCookie);
    const secondPage = await request(app)
      .get(`/api/workspaces/${workspace.id}/members?page=2`)
      .set("Cookie", authCookie);

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 26,
      totalPages: 2,
    });
    expect(firstPage.body.data.members).toHaveLength(20);
    expect(firstPage.body.data.members[0]).toMatchObject({
      id: owner.id,
      role: WorkspaceRole.OWNER,
      joinedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data.pagination).toEqual({
      page: 2,
      pageSize: 20,
      total: 26,
      totalPages: 2,
    });
    expect(secondPage.body.data.members).toHaveLength(6);

    const firstPageIds = new Set(
      firstPage.body.data.members.map((member: { id: number }) => member.id),
    );
    expect(
      secondPage.body.data.members.every(
        (member: { id: number }) => !firstPageIds.has(member.id),
      ),
    ).toBe(true);
  });

  it("rejects a requested page size above the global maximum", async () => {
    const { workspace, authCookie } = await createWorkspaceWithMembers(1);

    const response = await request(app)
      .get(`/api/workspaces/${workspace.id}/members?pageSize=21`)
      .set("Cookie", authCookie);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(getCachedWorkspaceMembers).not.toHaveBeenCalled();
  });
});
