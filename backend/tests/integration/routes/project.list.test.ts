import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { getProjects } from "../../../src/services/project.service.js";

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
  getProjects: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = { id: 7, email: "member@example.com" };
const authCookie = `accessToken=${jwt.sign(
  { sub: authenticatedUser.id, email: authenticatedUser.email },
  "test-only-jwt-secret",
)}`;
const projects = [{
  id: 25,
  name: "Website Redesign",
  description: "Refresh the marketing site.",
  icon: "desktop",
  status: "planning",
  startDate: "2026-09-01T00:00:00.000Z",
  dueDate: "2026-10-01T00:00:00.000Z",
  defaultView: "board",
  createdAt: "2026-08-22T00:00:00.000Z",
}];

describe("GET /api/workspaces/:workspaceId/projects", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(getProjects).mockResolvedValue(projects as never);
  });

  it("returns projects for an authenticated workspace member", async () => {
    const response = await request(app)
      .get("/api/workspaces/42/projects")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Projects retrieved",
      data: projects,
    });
    expect(findWorkspaceMembership).toHaveBeenCalledWith(42, 7);
    expect(getProjects).toHaveBeenCalledWith(42);
  });

  it("rejects a request without authentication", async () => {
    const response = await request(app).get("/api/workspaces/42/projects");

    expect(response.status).toBe(401);
    expect(getProjects).not.toHaveBeenCalled();
  });

  it("rejects a non-member before calling the project service", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce(null);

    const response = await request(app)
      .get("/api/workspaces/42/projects")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("You do not have access to this workspace");
    expect(getProjects).not.toHaveBeenCalled();
  });

  it("rejects an invalid workspace ID before checking membership", async () => {
    const response = await request(app)
      .get("/api/workspaces/not-an-id/projects")
      .set("Cookie", authCookie);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(getProjects).not.toHaveBeenCalled();
  });
});
