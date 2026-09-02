import jwt from "jsonwebtoken";
import request from "supertest";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { getWorkspaceTaskHistory } from "../../../src/services/workspace.service.js";
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

vi.mock(
  "../../../src/services/workspace.service.js",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../../src/services/workspace.service.js")
    >()),
    getWorkspaceTaskHistory: vi.fn(),
  }),
);

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
      changes: { status: { from: "todo", to: "done" } },
      createdAt: "2026-09-02T02:26:00.000Z",
      actor: {
        id: 7,
        firstname: "Rustam",
        lastname: "Jordan",
        email: "member@example.com",
      },
      task: {
        id: 101,
        title: "Ship workspace history",
        project: { id: 25, name: "Platform" },
      },
    },
  ],
  nextCursor: 18,
};

describe("GET /api/workspaces/:workspaceId/history", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(getWorkspaceTaskHistory).mockResolvedValue(historyResult as never);
  });

  it("returns workspace history details to a workspace member", async () => {
    const response = await request(app)
      .get("/api/workspaces/42/history")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Workspace history retrieved",
      data: historyResult,
    });
    expect(getWorkspaceTaskHistory).toHaveBeenCalledWith(42, undefined, 25);
  });

  it("forwards the requested history cursor and limit", async () => {
    const response = await request(app)
      .get("/api/workspaces/42/history?cursor=18&limit=10")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(getWorkspaceTaskHistory).toHaveBeenCalledWith(42, 18, 10);
  });

  it("rejects missing authentication without checking membership", async () => {
    const response = await request(app).get("/api/workspaces/42/history");

    expect(response.status).toBe(401);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(getWorkspaceTaskHistory).not.toHaveBeenCalled();
  });

  it.each(["0", "invalid", "9007199254740992"])(
    "rejects invalid workspace IDs before checking membership: %s",
    async (workspaceId) => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/history`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(400);
      expect(findWorkspaceMembership).not.toHaveBeenCalled();
      expect(getWorkspaceTaskHistory).not.toHaveBeenCalled();
    },
  );

  it.each(["cursor=0", "cursor=invalid", "limit=101"])(
    "rejects invalid history pagination before checking membership: %s",
    async (query) => {
      const response = await request(app)
        .get(`/api/workspaces/42/history?${query}`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(400);
      expect(findWorkspaceMembership).not.toHaveBeenCalled();
      expect(getWorkspaceTaskHistory).not.toHaveBeenCalled();
    },
  );

  it("rejects non-members before fetching history", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValueOnce(null);

    const response = await request(app)
      .get("/api/workspaces/42/history")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(getWorkspaceTaskHistory).not.toHaveBeenCalled();
  });
});
