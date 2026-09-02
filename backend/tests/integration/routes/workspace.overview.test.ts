import jwt from "jsonwebtoken";
import request from "supertest";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { getWorkspaceOverview } from "../../../src/services/workspace.service.js";
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
    getWorkspaceOverview: vi.fn(),
  }),
);

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = {
  id: 7,
  email: "member@example.com",
};
const authCookie = `accessToken=${jwt.sign(
  { sub: authenticatedUser.id, email: authenticatedUser.email },
  "test-only-jwt-secret",
)}`;

const workspaceOverview = {
  id: 42,
  displayName: "Engineering Team",
  description: "Builds and maintains the product.",
  icon: "code" as const,
  createdAt: "2026-08-18T00:00:00.000Z",
  memberCount: 1,
  recentUpdates: [],
  taskSummary: {
    todo: 3,
    inProgress: 4,
    inReview: 1,
    done: 2,
  },
  projects: [
    {
      id: 25,
      name: "Website Redesign",
      description: "Refresh the marketing site.",
      icon: "desktop" as const,
      status: "planning" as const,
      startDate: "2026-09-01T00:00:00.000Z",
      dueDate: "2026-10-01T00:00:00.000Z",
      defaultView: "board" as const,
      createdAt: "2026-08-22T00:00:00.000Z",
      taskCount: 8,
      completedTaskCount: 3,
    },
  ],
};

describe("GET /api/workspaces/:workspaceId/overview", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(getWorkspaceOverview).mockResolvedValue(workspaceOverview);
  });

  it("returns 401 without checking membership when authentication is missing", async () => {
    const response = await request(app).get("/api/workspaces/42/overview");

    expect(response.status).toBe(401);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
  });

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "returns 400 without checking membership when workspace ID %s is invalid",
    async (workspaceId) => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/overview`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
      expect(findWorkspaceMembership).not.toHaveBeenCalled();
    },
  );

  it("returns 403 without protected content when the user is not a workspace member", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue(null);

    const response = await request(app)
      .get("/api/workspaces/42/overview")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: "You do not have access to this workspace",
    });
    expect(response.body).not.toHaveProperty("data");
    expect(findWorkspaceMembership).toHaveBeenCalledWith(
      42,
      authenticatedUser.id,
    );
  });

  it.each(["OWNER", "ADMIN", "MEMBER"] as const)(
    "allows a workspace %s to access the overview",
    async (role) => {
      vi.mocked(findWorkspaceMembership).mockResolvedValue({ role });

      const response = await request(app)
        .get("/api/workspaces/42/overview")
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Workspace overview retrieved",
        data: workspaceOverview,
      });
      expect(findWorkspaceMembership).toHaveBeenCalledWith(
        42,
        authenticatedUser.id,
      );
      expect(getWorkspaceOverview).toHaveBeenCalledWith(42);
      expect(response.body.data.projects[0]).toMatchObject({
        taskCount: 8,
        completedTaskCount: 3,
      });
      expect(response.body.data.taskSummary).toEqual({
        todo: 3,
        inProgress: 4,
        inReview: 1,
        done: 2,
      });
    },
  );
});
