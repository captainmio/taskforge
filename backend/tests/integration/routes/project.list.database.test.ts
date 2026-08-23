import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCachedProjectList,
  setCachedProjectList,
} from "../../../src/cache/project-list.cache.js";
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

vi.mock("../../../src/cache/project-list.cache.js", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../src/cache/project-list.cache.js")
  >()),
  getCachedProjectList: vi.fn(),
  setCachedProjectList: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

describe("GET /api/workspaces/:workspaceId/projects with PostgreSQL", () => {
  beforeEach(async () => {
    vi.mocked(getCachedProjectList).mockResolvedValue(null);
    vi.mocked(setCachedProjectList).mockResolvedValue(undefined);
    await clearTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns only the workspace projects in newest-first order", async () => {
    const owner = await prisma.user.create({
      data: {
        email: "owner@example.com",
        firstname: "Project",
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
        members: { create: { userId: owner.id, role: WorkspaceRole.OWNER } },
      },
    });
    const otherWorkspace = await prisma.workspace.create({
      data: {
        name: "design team",
        displayName: "Design Team",
        description: "Designs the product.",
        icon: WorkspaceIcon.team,
        ownerId: owner.id,
        members: { create: { userId: owner.id, role: WorkspaceRole.OWNER } },
      },
    });

    await prisma.project.createMany({
      data: [
        {
          workspaceId: workspace.id,
          createdById: owner.id,
          name: "Older Project",
          description: "First project.",
          icon: ProjectIcon.desktop,
          status: ProjectStatus.planning,
          startDate: null,
          dueDate: null,
          defaultView: ProjectDefaultView.list,
          createdAt: new Date("2026-08-22T00:00:00.000Z"),
        },
        {
          workspaceId: workspace.id,
          createdById: owner.id,
          name: "Newer Project",
          description: "Latest project.",
          icon: ProjectIcon.mobile,
          status: ProjectStatus.active,
          startDate: new Date("2026-09-01T00:00:00.000Z"),
          dueDate: new Date("2026-10-01T00:00:00.000Z"),
          defaultView: ProjectDefaultView.board,
          createdAt: new Date("2026-08-23T00:00:00.000Z"),
        },
        {
          workspaceId: otherWorkspace.id,
          createdById: owner.id,
          name: "Other Workspace Project",
          description: "Must not be returned.",
          icon: ProjectIcon.code,
          status: ProjectStatus.completed,
          startDate: null,
          dueDate: null,
          defaultView: ProjectDefaultView.calendar,
        },
      ],
    });
    const authCookie = `accessToken=${jwt.sign(
      { sub: owner.id, email: owner.email },
      JWT_SECRET,
    )}`;

    const response = await request(app)
      .get(`/api/workspaces/${workspace.id}/projects`)
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Projects retrieved",
      data: {
        currentUserRole: WorkspaceRole.OWNER,
        projects: [
          {
            id: expect.any(Number),
            name: "Newer Project",
            description: "Latest project.",
            icon: ProjectIcon.mobile,
            status: ProjectStatus.active,
            startDate: "2026-09-01T00:00:00.000Z",
            dueDate: "2026-10-01T00:00:00.000Z",
            defaultView: ProjectDefaultView.board,
            createdAt: "2026-08-23T00:00:00.000Z",
          },
          {
            id: expect.any(Number),
            name: "Older Project",
            description: "First project.",
            icon: ProjectIcon.desktop,
            status: ProjectStatus.planning,
            startDate: null,
            dueDate: null,
            defaultView: ProjectDefaultView.list,
            createdAt: "2026-08-22T00:00:00.000Z",
          },
        ],
      },
    });
    expect(setCachedProjectList).toHaveBeenCalledWith(
      workspace.id,
      response.body.data.projects,
    );
  });
});
