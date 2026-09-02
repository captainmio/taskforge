import jwt from "jsonwebtoken";
import request from "supertest";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { getTaskHistory } from "../../../src/services/task.service.js";
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
  getTaskHistory: vi.fn(),
  updateTask: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const authCookie = `accessToken=${jwt.sign(
  { sub: 7, email: "member@example.com" },
  "test-only-jwt-secret",
)}`;

const historyResult = {
  history: [
    {
      id: 18,
      action: "updated",
      changes: { priority: { from: "medium", to: "high" } },
      createdAt: "2026-09-02T02:26:00.000Z",
      actor: {
        id: 7,
        firstname: "Rustam",
        lastname: "Jordan",
        email: "member@example.com",
      },
    },
  ],
  nextCursor: 18,
};

describe("GET /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/history", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(getTaskHistory).mockResolvedValue(historyResult as never);
  });

  it("returns history details and the actor for a workspace member", async () => {
    const response = await request(app)
      .get("/api/workspaces/42/projects/25/tasks/101/history")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Task history retrieved",
      data: historyResult,
    });
    expect(getTaskHistory).toHaveBeenCalledWith(42, 25, 101, undefined, 20);
  });

  it("forwards pagination values to the history service", async () => {
    const response = await request(app)
      .get("/api/workspaces/42/projects/25/tasks/101/history?cursor=18&limit=10")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(getTaskHistory).toHaveBeenCalledWith(42, 25, 101, 18, 10);
  });

  it("rejects an invalid history limit before checking membership", async () => {
    const response = await request(app)
      .get("/api/workspaces/42/projects/25/tasks/101/history?limit=101")
      .set("Cookie", authCookie);

    expect(response.status).toBe(400);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(getTaskHistory).not.toHaveBeenCalled();
  });

  it("rejects a non-member before fetching history", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce(null);

    const response = await request(app)
      .get("/api/workspaces/42/projects/25/tasks/101/history")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(getTaskHistory).not.toHaveBeenCalled();
  });
});
