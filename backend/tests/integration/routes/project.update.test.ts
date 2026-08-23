import jwt from "jsonwebtoken";
import request from "supertest";
import {
  ProjectNotFoundError,
  ProjectUpdateForbiddenError,
} from "../../../src/errors/project.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { updateProject } from "../../../src/services/project.service.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  getProjectById: vi.fn(),
  getProjects: vi.fn(),
  updateProject: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = { id: 7, email: "owner@example.com" };
const authCookie = `accessToken=${jwt.sign(
  { sub: authenticatedUser.id, email: authenticatedUser.email },
  "test-only-jwt-secret",
)}`;
const payload = {
  projectName: "Website Redesign",
  description: "Refresh the marketing site.",
  icon: "desktop",
  status: "planning",
  startDate: "2026-09-01",
  dueDate: "2026-10-01",
  defaultView: "board",
};

describe("PATCH /api/workspaces/:workspaceId/projects/:projectId", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "OWNER" });
    vi.mocked(updateProject).mockResolvedValue({ id: 25 });
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "updates a project when the requester is a workspace %s",
    async (role) => {
      vi.mocked(findWorkspaceMembership).mockResolvedValueOnce({ role });

      const response = await request(app)
        .patch("/api/workspaces/42/projects/25")
        .set("Cookie", authCookie)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Project updated",
        data: { id: 25 },
      });
      expect(updateProject).toHaveBeenCalledWith(42, 25, role, payload);
    },
  );

  it("rejects invalid route parameters before checking membership", async () => {
    const response = await request(app)
      .patch("/api/workspaces/42/projects/invalid")
      .set("Cookie", authCookie)
      .send(payload);

    expect(response.status).toBe(400);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload before checking membership", async () => {
    const response = await request(app)
      .patch("/api/workspaces/42/projects/25")
      .set("Cookie", authCookie)
      .send({ ...payload, dueDate: "2026-08-31" });

    expect(response.status).toBe(400);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("rejects a non-member before calling the project service", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce(null);

    const response = await request(app)
      .patch("/api/workspaces/42/projects/25")
      .set("Cookie", authCookie)
      .send(payload);

    expect(response.status).toBe(403);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("returns 403 when a member attempts an update", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce({ role: "MEMBER" });
    vi.mocked(updateProject).mockRejectedValueOnce(
      new ProjectUpdateForbiddenError(),
    );

    const response = await request(app)
      .patch("/api/workspaces/42/projects/25")
      .set("Cookie", authCookie)
      .send(payload);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe(
      "Only workspace owners and admins can update projects",
    );
  });

  it("returns 404 when the project is not in the workspace", async () => {
    vi.mocked(updateProject).mockRejectedValueOnce(new ProjectNotFoundError());

    const response = await request(app)
      .patch("/api/workspaces/42/projects/25")
      .set("Cookie", authCookie)
      .send(payload);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Project not found");
  });

  it("returns 500 when the update service fails unexpectedly", async () => {
    vi.mocked(updateProject).mockRejectedValueOnce(new Error("Database offline"));

    const response = await request(app)
      .patch("/api/workspaces/42/projects/25")
      .set("Cookie", authCookie)
      .send(payload);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Something went wrong on our end");
  });
});
