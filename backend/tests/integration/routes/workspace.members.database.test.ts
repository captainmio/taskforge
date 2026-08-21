import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteCachedWorkspaceMemberLists,
  getCachedWorkspaceMembers,
  setCachedWorkspaceMembers,
} from "../../../src/cache/workspace-members.cache.js";
import { deleteCachedWorkspaceOverview } from "../../../src/cache/workspace-overview.cache.js";
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

vi.mock("../../../src/cache/workspace-overview.cache.js", () => ({
  deleteCachedWorkspaceOverview: vi.fn(),
  getCachedWorkspaceOverview: vi.fn(),
  setCachedWorkspaceOverview: vi.fn(),
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

  return { owner, workspace, members, authCookie };
};

describe("GET /api/workspaces/:workspaceId/members with PostgreSQL", () => {
  beforeEach(async () => {
    vi.mocked(getCachedWorkspaceMembers).mockResolvedValue(null);
    vi.mocked(setCachedWorkspaceMembers).mockResolvedValue(undefined);
    vi.mocked(deleteCachedWorkspaceMemberLists).mockResolvedValue(undefined);
    vi.mocked(deleteCachedWorkspaceOverview).mockResolvedValue(undefined);
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
    expect(firstPage.body.data.currentUserRole).toBe(WorkspaceRole.OWNER);
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
    expect(secondPage.body.data.currentUserRole).toBe(WorkspaceRole.OWNER);
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

  it("returns an admin role when that admin is not included in the requested page", async () => {
    const { workspace, members } = await createWorkspaceWithMembers(25);
    const admin = members[0];
    if (!admin) throw new Error("Expected the workspace admin fixture to exist");
    const adminCookie = `accessToken=${jwt.sign(
      { sub: admin.id, email: admin.email },
      JWT_SECRET,
    )}`;

    const response = await request(app)
      .get(`/api/workspaces/${workspace.id}/members?page=2`)
      .set("Cookie", adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.currentUserRole).toBe(WorkspaceRole.ADMIN);
    expect(
      response.body.data.members.some(
        (member: { id: number }) => member.id === admin.id,
      ),
    ).toBe(false);
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

  it("lets an admin delete a member and immediately removes that member's access", async () => {
    const { workspace, members } = await createWorkspaceWithMembers(2);
    const admin = members[0];
    const member = members[1];
    if (!admin || !member) {
      throw new Error("Expected the admin and member fixtures to exist");
    }
    const adminCookie = `accessToken=${jwt.sign(
      { sub: admin.id, email: admin.email },
      JWT_SECRET,
    )}`;
    const memberCookie = `accessToken=${jwt.sign(
      { sub: member.id, email: member.email },
      JWT_SECRET,
    )}`;

    const removalResponse = await request(app)
      .delete(`/api/workspaces/${workspace.id}/members/${member.id}`)
      .set("Cookie", adminCookie);

    expect(removalResponse.status).toBe(200);
    expect(removalResponse.body.data).toEqual({ memberId: member.id });
    await expect(
      prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: member.id,
          },
        },
      }),
    ).resolves.toBeNull();
    expect(deleteCachedWorkspaceOverview).toHaveBeenCalledWith(workspace.id);
    expect(deleteCachedWorkspaceMemberLists).toHaveBeenCalledWith(workspace.id);

    const subsequentResponse = await request(app)
      .get(`/api/workspaces/${workspace.id}/members`)
      .set("Cookie", memberCookie);
    expect(subsequentResponse.status).toBe(403);
  });

  it("keeps the owner membership when an admin attempts to remove it", async () => {
    const { owner, workspace, members } = await createWorkspaceWithMembers(1);
    const admin = members[0];
    if (!admin) throw new Error("Expected the admin fixture to exist");
    const adminCookie = `accessToken=${jwt.sign(
      { sub: admin.id, email: admin.email },
      JWT_SECRET,
    )}`;

    const response = await request(app)
      .delete(`/api/workspaces/${workspace.id}/members/${owner.id}`)
      .set("Cookie", adminCookie);

    expect(response.status).toBe(409);
    await expect(
      prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: owner.id,
          },
        },
      }),
    ).resolves.toMatchObject({ role: WorkspaceRole.OWNER });
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });

  it("prevents a regular member from deleting another workspace member", async () => {
    const { workspace, members } = await createWorkspaceWithMembers(2);
    const admin = members[0];
    const member = members[1];
    if (!admin || !member) {
      throw new Error("Expected the admin and member fixtures to exist");
    }
    const memberCookie = `accessToken=${jwt.sign(
      { sub: member.id, email: member.email },
      JWT_SECRET,
    )}`;

    const response = await request(app)
      .delete(`/api/workspaces/${workspace.id}/members/${admin.id}`)
      .set("Cookie", memberCookie);

    expect(response.status).toBe(403);
    await expect(
      prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: admin.id,
          },
        },
      }),
    ).resolves.toMatchObject({ role: WorkspaceRole.ADMIN });
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });

  it("updates a non-owner role in PostgreSQL and clears both member caches", async () => {
    const { workspace, members, authCookie } =
      await createWorkspaceWithMembers(2);
    const member = members[1];
    if (!member) throw new Error("Expected the member fixture to exist");

    const response = await request(app)
      .patch(`/api/workspaces/${workspace.id}/members/${member.id}`)
      .set("Cookie", authCookie)
      .send({ role: WorkspaceRole.ADMIN });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Workspace member role updated",
      data: {
        id: member.id,
        firstname: member.firstname,
        lastname: member.lastname,
        email: member.email,
        role: WorkspaceRole.ADMIN,
        joinedAt: "2026-01-01T00:00:02.000Z",
      },
    });
    await expect(
      prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: member.id,
          },
        },
      }),
    ).resolves.toMatchObject({ role: WorkspaceRole.ADMIN });
    expect(deleteCachedWorkspaceOverview).toHaveBeenCalledWith(workspace.id);
    expect(deleteCachedWorkspaceMemberLists).toHaveBeenCalledWith(workspace.id);
  });

  it("prevents an admin from demoting their own membership", async () => {
    const { workspace, members } = await createWorkspaceWithMembers(1);
    const admin = members[0];
    if (!admin) throw new Error("Expected the admin fixture to exist");
    const adminCookie = `accessToken=${jwt.sign(
      { sub: admin.id, email: admin.email },
      JWT_SECRET,
    )}`;

    const response = await request(app)
      .patch(`/api/workspaces/${workspace.id}/members/${admin.id}`)
      .set("Cookie", adminCookie)
      .send({ role: WorkspaceRole.MEMBER });

    expect(response.status).toBe(403);
    await expect(
      prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: admin.id,
          },
        },
      }),
    ).resolves.toMatchObject({ role: WorkspaceRole.ADMIN });
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });

  it("keeps the owner role when an admin attempts to change it", async () => {
    const { owner, workspace, members } = await createWorkspaceWithMembers(1);
    const admin = members[0];
    if (!admin) throw new Error("Expected the admin fixture to exist");
    const adminCookie = `accessToken=${jwt.sign(
      { sub: admin.id, email: admin.email },
      JWT_SECRET,
    )}`;

    const response = await request(app)
      .patch(`/api/workspaces/${workspace.id}/members/${owner.id}`)
      .set("Cookie", adminCookie)
      .send({ role: WorkspaceRole.MEMBER });

    expect(response.status).toBe(409);
    await expect(
      prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: owner.id,
          },
        },
      }),
    ).resolves.toMatchObject({ role: WorkspaceRole.OWNER });
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });

  it("prevents a regular member from changing another member's role", async () => {
    const { workspace, members } = await createWorkspaceWithMembers(2);
    const admin = members[0];
    const member = members[1];
    if (!admin || !member) {
      throw new Error("Expected the admin and member fixtures to exist");
    }
    const memberCookie = `accessToken=${jwt.sign(
      { sub: member.id, email: member.email },
      JWT_SECRET,
    )}`;

    const response = await request(app)
      .patch(`/api/workspaces/${workspace.id}/members/${admin.id}`)
      .set("Cookie", memberCookie)
      .send({ role: WorkspaceRole.MEMBER });

    expect(response.status).toBe(403);
    await expect(
      prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: admin.id,
          },
        },
      }),
    ).resolves.toMatchObject({ role: WorkspaceRole.ADMIN });
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });
});
