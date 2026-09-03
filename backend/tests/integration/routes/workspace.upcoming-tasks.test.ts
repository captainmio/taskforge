import jwt from "jsonwebtoken";
import request from "supertest";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { getWorkspaceUpcomingTasks } from "../../../src/services/workspace.service.js";
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
    getWorkspaceUpcomingTasks: vi.fn(),
  }),
);

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = { id: 7, email: "member@example.com" };
const authCookie = `accessToken=${jwt.sign(
  { sub: authenticatedUser.id, email: authenticatedUser.email },
  "test-only-jwt-secret",
)}`;

describe("GET /api/workspaces/:workspaceId/upcoming-tasks", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(getWorkspaceUpcomingTasks).mockResolvedValue({
      tasks: [],
      nextCursor: null,
    });
  });

  it("uses the authenticated member and requested pagination values", async () => {
    const response = await request(app)
      .get("/api/workspaces/42/upcoming-tasks?limit=5&cursor=81")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Upcoming tasks retrieved",
      data: { tasks: [], nextCursor: null },
    });
    expect(getWorkspaceUpcomingTasks).toHaveBeenCalledWith(42, 7, 81, 5);
  });

  it.each(["0", "101", "invalid"]) (
    "rejects invalid limits before checking workspace membership",
    async (limit) => {
      const response = await request(app)
        .get(`/api/workspaces/42/upcoming-tasks?limit=${limit}`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(400);
      expect(findWorkspaceMembership).not.toHaveBeenCalled();
      expect(getWorkspaceUpcomingTasks).not.toHaveBeenCalled();
    },
  );
});
