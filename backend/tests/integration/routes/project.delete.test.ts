import jwt from "jsonwebtoken";
import request from "supertest";
import {
  ProjectDeletionForbiddenError,
  ProjectNotFoundError,
} from "../../../src/errors/project.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { deleteProject } from "../../../src/services/project.service.js";
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
  getProjects: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = { id: 7, email: "owner@example.com" };
const authCookie = `accessToken=${jwt.sign(
  { sub: authenticatedUser.id, email: authenticatedUser.email },
  "test-only-jwt-secret",
)}`;

describe("DELETE /api/workspaces/:workspaceId/projects/:projectId", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "OWNER" });
    vi.mocked(deleteProject).mockResolvedValue({ id: 25 });
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "deletes a project when the requester is a workspace %s",
    async (role) => {
      vi.mocked(findWorkspaceMembership).mockResolvedValueOnce({ role });

      const response = await request(app)
        .delete("/api/workspaces/42/projects/25")
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Project deleted",
        data: { id: 25 },
      });
      expect(deleteProject).toHaveBeenCalledWith(42, 25, role);
    },
  );

  it("rejects an invalid project ID before checking membership", async () => {
    const response = await request(app)
      .delete("/api/workspaces/42/projects/invalid")
      .set("Cookie", authCookie);

    expect(response.status).toBe(400);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it("rejects a non-member before calling the project service", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce(null);

    const response = await request(app)
      .delete("/api/workspaces/42/projects/25")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it("returns 403 when a member attempts deletion", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce({ role: "MEMBER" });
    vi.mocked(deleteProject).mockRejectedValueOnce(
      new ProjectDeletionForbiddenError(),
    );

    const response = await request(app)
      .delete("/api/workspaces/42/projects/25")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Only workspace owners and admins can delete projects");
  });

  it("returns 404 when the project is not in the workspace", async () => {
    vi.mocked(deleteProject).mockRejectedValueOnce(new ProjectNotFoundError());

    const response = await request(app)
      .delete("/api/workspaces/42/projects/25")
      .set("Cookie", authCookie);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Project not found");
  });
});
