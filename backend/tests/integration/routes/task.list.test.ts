import jwt from "jsonwebtoken";
import request from "supertest";
import { ProjectNotFoundError } from "../../../src/errors/project.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { getProjectTasks } from "../../../src/services/task.service.js";
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

vi.mock("../../../src/services/task.service.js", () => ({
  createTask: vi.fn(),
  getProjectTasks: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const authCookie = `accessToken=${jwt.sign(
  { sub: 7, email: "member@example.com" },
  "test-only-jwt-secret",
)}`;
const result = {
  tasks: [{
    id: 101,
    title: "Implement task board",
    description: "Display project tasks in columns.",
    status: "todo",
    priority: "high",
    dueDate: null,
    timeEstimate: "4h",
    createdAt: "2026-08-27T00:00:00.000Z",
    updatedAt: "2026-08-27T00:00:00.000Z",
    assignees: [{
      id: 7,
      firstname: "Task",
      lastname: "Member",
      email: "member@example.com",
    }],
  }],
  pagination: { page: 2, pageSize: 100, total: 101, totalPages: 2 },
};

describe("GET /api/workspaces/:workspaceId/projects/:projectId/tasks", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(getProjectTasks).mockResolvedValue(result as never);
  });

  it("returns paginated tasks for a workspace member", async () => {
    const response = await request(app)
      .get("/api/workspaces/42/projects/25/tasks?page=2&pageSize=100")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Project tasks retrieved",
      data: result,
    });
    expect(getProjectTasks).toHaveBeenCalledWith(42, 25, 2, 100);
  });

  it("rejects an invalid page size before checking workspace membership", async () => {
    const response = await request(app)
      .get("/api/workspaces/42/projects/25/tasks?pageSize=101")
      .set("Cookie", authCookie);

    expect(response.status).toBe(400);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(getProjectTasks).not.toHaveBeenCalled();
  });

  it("rejects a non-member before calling the task service", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce(null);

    const response = await request(app)
      .get("/api/workspaces/42/projects/25/tasks")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(getProjectTasks).not.toHaveBeenCalled();
  });

  it("returns not found when the project is outside the workspace", async () => {
    vi.mocked(getProjectTasks).mockRejectedValueOnce(new ProjectNotFoundError());

    const response = await request(app)
      .get("/api/workspaces/42/projects/25/tasks")
      .set("Cookie", authCookie);

    expect(response.status).toBe(404);
  });
});
