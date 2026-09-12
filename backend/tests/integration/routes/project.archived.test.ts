import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectRestoreForbiddenError } from "../../../src/errors/project.errors.js";
import { findProjectAccessByWorkspace } from "../../../src/repositories/project.repository.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import {
  getArchivedProjects,
  restoreProject,
} from "../../../src/services/project.service.js";

vi.mock(
  "../../../src/repositories/project.repository.js",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../../src/repositories/project.repository.js")
    >()),
    findProjectAccessByWorkspace: vi.fn(),
  }),
);

vi.mock(
  "../../../src/repositories/workspace.repository.js",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../../src/repositories/workspace.repository.js")
    >()),
    findWorkspaceMembership: vi.fn(),
  }),
);

vi.mock("../../../src/services/project.service.js", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  getArchivedProjects: vi.fn(),
  getProjectById: vi.fn(),
  getProjects: vi.fn(),
  restoreProject: vi.fn(),
  updateProject: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = { id: 7, email: "owner@example.com" };
const authCookie = `accessToken=${jwt.sign(
  { sub: authenticatedUser.id, email: authenticatedUser.email },
  "test-only-jwt-secret",
)}`;

const archivedProjects = [
  {
    id: 25,
    name: "Website Redesign",
    description: "Refresh the marketing site.",
    icon: "desktop",
    status: "planning",
    startDate: null,
    dueDate: null,
    defaultView: "board",
    createdAt: "2026-08-22T00:00:00.000Z",
  },
];

describe("archived project routes", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "OWNER" });
    vi.mocked(findProjectAccessByWorkspace).mockResolvedValue({
      deletedAt: new Date("2026-09-10T00:00:00.000Z"),
    });
    vi.mocked(getArchivedProjects).mockResolvedValue(archivedProjects as never);
    vi.mocked(restoreProject).mockResolvedValue({ id: 25 });
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "lists archived projects for a workspace %s",
    async (role) => {
      vi.mocked(findWorkspaceMembership).mockResolvedValueOnce({ role });

      const response = await request(app)
        .get("/api/workspaces/42/projects/archived")
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        projects: archivedProjects,
        currentUserRole: role,
      });
      expect(getArchivedProjects).toHaveBeenCalledWith(42);
    },
  );

  it("does not expose archived projects to members", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce({ role: "MEMBER" });

    const response = await request(app)
      .get("/api/workspaces/42/projects/archived")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(getArchivedProjects).not.toHaveBeenCalled();
  });

  it("restores an archived project for its owner", async () => {
    const response = await request(app)
      .patch("/api/workspaces/42/projects/25/restore")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Project restored",
      data: { id: 25 },
    });
    expect(restoreProject).toHaveBeenCalledWith(42, 25, "OWNER", 7);
  });

  it("rejects an admin attempting to restore a project", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce({ role: "ADMIN" });
    vi.mocked(restoreProject).mockRejectedValueOnce(
      new ProjectRestoreForbiddenError(),
    );

    const response = await request(app)
      .patch("/api/workspaces/42/projects/25/restore")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe(
      "Only the workspace owner can restore projects",
    );
  });
});
