import jwt from "jsonwebtoken";
import request from "supertest";
import { ProjectNotFoundError } from "../../../src/errors/project.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import {
  createTaskComment,
  getTaskComments,
} from "../../../src/services/task.service.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const realtimeMocks = vi.hoisted(() => ({
  emitTaskCommentAdded: vi.fn(),
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
  createTaskComment: vi.fn(),
  getProjectTasks: vi.fn(),
  getTaskComments: vi.fn(),
  getTaskHistory: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("../../../src/realtime/task.socket.js", () => realtimeMocks);

const { default: app } = await import("../../../src/app.js");

const authCookie = `accessToken=${jwt.sign(
  { sub: 7, email: "member@example.com" },
  "test-only-jwt-secret",
)}`;

const comment = {
  id: 301,
  body: "I have started the implementation.",
  createdAt: "2026-09-05T09:00:00.000Z",
  author: { id: 7, firstname: "Alex", lastname: "Member" },
};

describe("task comment routes", () => {
  beforeEach(() => {
    realtimeMocks.emitTaskCommentAdded.mockReset();
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(createTaskComment).mockResolvedValue(comment as never);
    vi.mocked(getTaskComments).mockResolvedValue({
      comments: [comment],
      nextCursor: null,
    } as never);
  });

  it("returns paginated comments for a workspace member", async () => {
    const response = await request(app)
      .get("/api/workspaces/42/projects/25/tasks/101/comments?cursor=301&limit=10")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Task comments retrieved",
      data: { comments: [comment], nextCursor: null },
    });
    expect(getTaskComments).toHaveBeenCalledWith(42, 25, 101, 301, 10);
  });

  it("creates a comment and broadcasts the affected task", async () => {
    const response = await request(app)
      .post("/api/workspaces/42/projects/25/tasks/101/comments")
      .set("Cookie", authCookie)
      .send({ body: "I have started the implementation." });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      message: "Comment added",
      data: comment,
    });
    expect(createTaskComment).toHaveBeenCalledWith(
      42,
      25,
      101,
      7,
      comment.body,
    );
    expect(realtimeMocks.emitTaskCommentAdded).toHaveBeenCalledWith({
      workspaceId: 42,
      projectId: 25,
      taskId: 101,
    });
  });

  it("rejects blank comments before checking membership", async () => {
    const response = await request(app)
      .post("/api/workspaces/42/projects/25/tasks/101/comments")
      .set("Cookie", authCookie)
      .send({ body: "   " });

    expect(response.status).toBe(400);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(createTaskComment).not.toHaveBeenCalled();
  });

  it("returns forbidden to users outside the workspace", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce(null);

    const response = await request(app)
      .get("/api/workspaces/42/projects/25/tasks/101/comments")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(getTaskComments).not.toHaveBeenCalled();
  });

  it("returns not found when the project is unavailable", async () => {
    vi.mocked(getTaskComments).mockRejectedValueOnce(new ProjectNotFoundError());

    const response = await request(app)
      .get("/api/workspaces/42/projects/25/tasks/101/comments")
      .set("Cookie", authCookie);

    expect(response.status).toBe(404);
  });
});
