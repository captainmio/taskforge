import jwt from "jsonwebtoken";
import request from "supertest";
import { ProjectNotFoundError } from "../../../src/errors/project.errors.js";
import { TaskAssigneeNotInWorkspaceError } from "../../../src/errors/task.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { createTask } from "../../../src/services/task.service.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const realtimeMocks = vi.hoisted(() => ({
  emitTaskCreated: vi.fn(),
  emitTaskUpdated: vi.fn(),
}));

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
}));

vi.mock("../../../src/realtime/task.socket.js", () => realtimeMocks);

const { default: app } = await import("../../../src/app.js");

const authCookie = `accessToken=${jwt.sign(
  { sub: 7, email: "member@example.com" },
  "test-only-jwt-secret",
)}`;
const payload = {
  title: "Implement login flow",
  description: "Connect the sign-in form to authentication.",
  status: "todo",
  priority: "medium",
  assigneeIds: ["7"],
  dueDate: "2026-09-15",
  timeEstimate: "1d 4h",
};

describe("POST /api/workspaces/:workspaceId/projects/:projectId/tasks", () => {
  beforeEach(() => {
    realtimeMocks.emitTaskCreated.mockReset();
    realtimeMocks.emitTaskUpdated.mockReset();
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(createTask).mockResolvedValue({ id: 101 });
  });

  it("creates a task for a workspace member", async () => {
    const response = await request(app)
      .post("/api/workspaces/42/projects/25/tasks")
      .set("Cookie", authCookie)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      message: "Task created",
      data: { id: 101 },
    });
    expect(createTask).toHaveBeenCalledWith(42, 25, 7, {
      ...payload,
      assigneeIds: [7],
    });
    expect(realtimeMocks.emitTaskCreated).toHaveBeenCalledWith({
      workspaceId: 42,
      projectId: 25,
      taskId: 101,
    });
  });

  it("rejects an invalid payload before checking workspace membership", async () => {
    const response = await request(app)
      .post("/api/workspaces/42/projects/25/tasks")
      .set("Cookie", authCookie)
      .send({ ...payload, title: "" });

    expect(response.status).toBe(400);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("returns not found when the project is outside the workspace", async () => {
    vi.mocked(createTask).mockRejectedValueOnce(new ProjectNotFoundError());

    const response = await request(app)
      .post("/api/workspaces/42/projects/25/tasks")
      .set("Cookie", authCookie)
      .send(payload);

    expect(response.status).toBe(404);
  });

  it("rejects assignees outside the workspace", async () => {
    vi.mocked(createTask).mockRejectedValueOnce(
      new TaskAssigneeNotInWorkspaceError(),
    );

    const response = await request(app)
      .post("/api/workspaces/42/projects/25/tasks")
      .set("Cookie", authCookie)
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Each assignee must belong to this workspace",
    );
  });
});
