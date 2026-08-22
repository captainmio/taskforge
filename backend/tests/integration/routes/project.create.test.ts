import jwt from "jsonwebtoken";
import request from "supertest";
import { ProjectCreationForbiddenError } from "../../../src/errors/project.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { createProject } from "../../../src/services/project.service.js";
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
const createdProject = {
  id: 25,
  workspaceId: 42,
  createdById: 7,
  name: payload.projectName,
  description: payload.description,
  icon: payload.icon,
  status: payload.status,
  startDate: new Date("2026-09-01T00:00:00.000Z"),
  dueDate: new Date("2026-10-01T00:00:00.000Z"),
  defaultView: payload.defaultView,
  createdAt: new Date("2026-08-22T00:00:00.000Z"),
};

describe("POST /api/workspaces/:workspaceId/projects", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "OWNER" });
    vi.mocked(createProject).mockResolvedValue(createdProject as never);
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "creates a project for a workspace %s and receives the parent workspace ID",
    async (role) => {
      vi.mocked(findWorkspaceMembership).mockResolvedValueOnce({ role });

      const response = await request(app)
        .post("/api/workspaces/42/projects")
        .set("Cookie", authCookie)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: "Project created",
        data: {
          ...createdProject,
          startDate: "2026-09-01T00:00:00.000Z",
          dueDate: "2026-10-01T00:00:00.000Z",
          createdAt: "2026-08-22T00:00:00.000Z",
        },
      });
      expect(findWorkspaceMembership).toHaveBeenCalledWith(42, 7);
      expect(createProject).toHaveBeenCalledWith(42, 7, role, payload);
    },
  );

  it("rejects an invalid payload before checking workspace membership", async () => {
    const response = await request(app)
      .post("/api/workspaces/42/projects")
      .set("Cookie", authCookie)
      .send({ ...payload, dueDate: "2026-08-31" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(createProject).not.toHaveBeenCalled();
  });

  it("rejects a non-member before calling the project service", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce(null);

    const response = await request(app)
      .post("/api/workspaces/42/projects")
      .set("Cookie", authCookie)
      .send(payload);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("You do not have access to this workspace");
    expect(createProject).not.toHaveBeenCalled();
  });

  it("returns 403 when a member tries to create a project", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce({ role: "MEMBER" });
    vi.mocked(createProject).mockRejectedValueOnce(
      new ProjectCreationForbiddenError(),
    );

    const response = await request(app)
      .post("/api/workspaces/42/projects")
      .set("Cookie", authCookie)
      .send(payload);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe(
      "Only workspace owners and admins can create projects",
    );
    expect(createProject).toHaveBeenCalledWith(42, 7, "MEMBER", payload);
  });
});
