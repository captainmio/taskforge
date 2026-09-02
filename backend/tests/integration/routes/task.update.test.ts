import jwt from "jsonwebtoken";
import request from "supertest";
import { ProjectNotFoundError } from "../../../src/errors/project.errors.js";
import {
  TaskAssigneeNotInWorkspaceError,
  TaskCompletionForbiddenError,
  TaskNotFoundError,
} from "../../../src/errors/task.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { updateTask } from "../../../src/services/task.service.js";
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
  getProjectTasks: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("../../../src/realtime/task.socket.js", () => realtimeMocks);

const { default: app } = await import("../../../src/app.js");

const authCookie = `accessToken=${jwt.sign(
  { sub: 7, email: "member@example.com" },
  "test-only-jwt-secret",
)}`;
const updatedTask = {
  id: 101,
  title: "Implement login flow",
  description: "Connect the sign-in form to authentication.",
  status: "done",
  position: 0,
  priority: "medium",
  dueDate: "2026-09-15",
  timeEstimate: "1d 4h",
  createdAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:00.000Z",
  assignees: [{
    id: 7,
    firstname: "Task",
    lastname: "Member",
    email: "member@example.com",
  }],
};

describe("PATCH /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId", () => {
  beforeEach(() => {
    realtimeMocks.emitTaskCreated.mockReset();
    realtimeMocks.emitTaskUpdated.mockReset();
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(updateTask).mockResolvedValue(updatedTask as never);
  });

  it("updates supplied task fields for a workspace member", async () => {
    const response = await request(app)
      .patch("/api/workspaces/42/projects/25/tasks/101")
      .set("Cookie", authCookie)
      .send({ status: "done", position: 0 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Task updated",
      data: updatedTask,
    });
    expect(updateTask).toHaveBeenCalledWith(42, 25, 101, "MEMBER", {
      status: "done",
      position: 0,
    }, 7);
    expect(realtimeMocks.emitTaskUpdated).toHaveBeenCalledWith({
      workspaceId: 42,
      projectId: 25,
      task: updatedTask,
    });
  });

  it("returns forbidden when a member moves a task to Done", async () => {
    vi.mocked(updateTask).mockRejectedValueOnce(new TaskCompletionForbiddenError());
    const response = await request(app).patch("/api/workspaces/42/projects/25/tasks/101").set("Cookie", authCookie).send({ status: "done" });
    expect(response.status).toBe(403);
  });

  it("rejects an empty update before checking workspace membership", async () => {
    const response = await request(app)
      .patch("/api/workspaces/42/projects/25/tasks/101")
      .set("Cookie", authCookie)
      .send({});

    expect(response.status).toBe(400);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("rejects a non-member before calling the task service", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce(null);

    const response = await request(app)
      .patch("/api/workspaces/42/projects/25/tasks/101")
      .set("Cookie", authCookie)
      .send({ status: "done" });

    expect(response.status).toBe(403);
    expect(updateTask).not.toHaveBeenCalled();
  });

  it.each([
    ["the project is outside the workspace", new ProjectNotFoundError()],
    ["the task is outside the project", new TaskNotFoundError()],
  ])("returns not found when %s", async (_, error) => {
    vi.mocked(updateTask).mockRejectedValueOnce(error);

    const response = await request(app)
      .patch("/api/workspaces/42/projects/25/tasks/101")
      .set("Cookie", authCookie)
      .send({ status: "done" });

    expect(response.status).toBe(404);
  });

  it("rejects replacement assignees outside the workspace", async () => {
    vi.mocked(updateTask).mockRejectedValueOnce(
      new TaskAssigneeNotInWorkspaceError(),
    );

    const response = await request(app)
      .patch("/api/workspaces/42/projects/25/tasks/101")
      .set("Cookie", authCookie)
      .send({ assigneeIds: ["88"] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Each assignee must belong to this workspace",
    );
  });
});
