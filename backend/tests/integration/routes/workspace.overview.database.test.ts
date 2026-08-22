import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCachedWorkspaceOverview,
  setCachedWorkspaceOverview,
} from "../../../src/cache/workspace-overview.cache.js";
import { JWT_SECRET } from "../../../src/config/auth.js";
import { prisma } from "../../../src/config/database.js";
import {
  ProjectDefaultView,
  ProjectIcon,
  ProjectStatus,
  WorkspaceIcon,
  WorkspaceRole,
} from "../../../src/generated/prisma/enums.js";
import { clearTestDatabase } from "../../helpers/database.js";

vi.mock("../../../src/cache/workspace-overview.cache.js", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../src/cache/workspace-overview.cache.js")
  >()),
  getCachedWorkspaceOverview: vi.fn(),
  setCachedWorkspaceOverview: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

describe("GET /api/workspaces/:workspaceId/overview with PostgreSQL", () => {
  beforeEach(async () => {
    vi.mocked(getCachedWorkspaceOverview).mockResolvedValue(null);
    vi.mocked(setCachedWorkspaceOverview).mockResolvedValue(undefined);
    await clearTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns the selected workspace metadata and normalized members", async () => {
    const owner = await prisma.user.create({
      data: {
        email: "owner@example.com",
        firstname: "Workspace",
        lastname: "Owner",
        password: "hashed-password",
      },
    });
    const member = await prisma.user.create({
      data: {
        email: "member@example.com",
        firstname: "Workspace",
        lastname: "Member",
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
        createdAt: new Date("2026-08-18T00:00:00.000Z"),
        members: {
          create: [
            {
              userId: owner.id,
              role: WorkspaceRole.OWNER,
              createdAt: new Date("2026-08-18T00:00:00.000Z"),
            },
            {
              userId: member.id,
              role: WorkspaceRole.MEMBER,
              createdAt: new Date("2026-08-20T00:00:00.000Z"),
            },
          ],
        },
        projects: {
          create: [
            {
              name: "Website Redesign",
              description: "Refresh the marketing site.",
              icon: ProjectIcon.desktop,
              status: ProjectStatus.planning,
              startDate: new Date("2026-09-01T00:00:00.000Z"),
              dueDate: new Date("2026-10-01T00:00:00.000Z"),
              defaultView: ProjectDefaultView.board,
              createdById: owner.id,
              createdAt: new Date("2026-08-22T00:00:00.000Z"),
            },
            {
              name: "Mobile App",
              description: "Build the mobile application.",
              icon: ProjectIcon.mobile,
              status: ProjectStatus.active,
              startDate: null,
              dueDate: null,
              defaultView: ProjectDefaultView.list,
              createdById: owner.id,
              createdAt: new Date("2026-08-23T00:00:00.000Z"),
            },
          ],
        },
      },
    });
    const authCookie = `accessToken=${jwt.sign(
      { sub: owner.id, email: owner.email },
      JWT_SECRET,
    )}`;

    const response = await request(app)
      .get(`/api/workspaces/${workspace.id}/overview`)
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Workspace overview retrieved",
      data: {
        id: workspace.id,
        displayName: "Engineering Team",
        description: "Builds and maintains the product.",
        icon: WorkspaceIcon.code,
        createdAt: "2026-08-18T00:00:00.000Z",
        members: [
          {
            id: owner.id,
            firstname: owner.firstname,
            lastname: owner.lastname,
            email: owner.email,
            role: WorkspaceRole.OWNER,
            joinedAt: "2026-08-18T00:00:00.000Z",
          },
          {
            id: member.id,
            firstname: member.firstname,
            lastname: member.lastname,
            email: member.email,
            role: WorkspaceRole.MEMBER,
            joinedAt: "2026-08-20T00:00:00.000Z",
          },
        ],
        projects: [
          {
            id: expect.any(Number),
            name: "Mobile App",
            description: "Build the mobile application.",
            icon: ProjectIcon.mobile,
            status: ProjectStatus.active,
            startDate: null,
            dueDate: null,
            defaultView: ProjectDefaultView.list,
            createdAt: "2026-08-23T00:00:00.000Z",
          },
          {
            id: expect.any(Number),
            name: "Website Redesign",
            description: "Refresh the marketing site.",
            icon: ProjectIcon.desktop,
            status: ProjectStatus.planning,
            startDate: "2026-09-01T00:00:00.000Z",
            dueDate: "2026-10-01T00:00:00.000Z",
            defaultView: ProjectDefaultView.board,
            createdAt: "2026-08-22T00:00:00.000Z",
          },
        ],
      },
    });
    expect(setCachedWorkspaceOverview).toHaveBeenCalledWith(
      workspace.id,
      response.body.data,
    );
  });
});
