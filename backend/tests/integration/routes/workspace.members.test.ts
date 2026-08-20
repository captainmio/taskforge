import jwt from "jsonwebtoken";
import request from "supertest";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { getWorkspaceMembers } from "../../../src/services/workspace.service.js";
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
    getWorkspaceMembers: vi.fn(),
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
const memberPage = {
  members: [
    {
      id: 7,
      firstname: "Workspace",
      lastname: "Member",
      email: authenticatedUser.email,
      role: "MEMBER" as const,
      joinedAt: "2026-08-20T00:00:00.000Z",
    },
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  },
};

describe("GET /api/workspaces/:workspaceId/members", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(getWorkspaceMembers).mockResolvedValue(memberPage);
  });

  it("returns 401 before checking workspace membership when authentication is missing", async () => {
    const response = await request(app).get("/api/workspaces/42/members");

    expect(response.status).toBe(401);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(getWorkspaceMembers).not.toHaveBeenCalled();
  });

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "returns 400 before checking membership when workspace ID %s is invalid",
    async (workspaceId) => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/members`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
      expect(findWorkspaceMembership).not.toHaveBeenCalled();
      expect(getWorkspaceMembers).not.toHaveBeenCalled();
    },
  );

  it.each([
    "page=0",
    "page=-1",
    "page=1.5",
    "page=next",
    "page=9007199254740992",
    "pageSize=0",
    "pageSize=21",
    "pageSize=1.5",
    "pageSize=large",
  ])("returns 400 when pagination query %s is invalid", async (query) => {
    const response = await request(app)
      .get(`/api/workspaces/42/members?${query}`)
      .set("Cookie", authCookie);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(getWorkspaceMembers).not.toHaveBeenCalled();
  });

  it("returns 403 without member data when the user has no workspace membership", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue(null);

    const response = await request(app)
      .get("/api/workspaces/42/members")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: "You do not have access to this workspace",
    });
    expect(getWorkspaceMembers).not.toHaveBeenCalled();
  });

  it.each(["OWNER", "ADMIN", "MEMBER"] as const)(
    "uses the default page for a workspace %s",
    async (role) => {
      vi.mocked(findWorkspaceMembership).mockResolvedValue({ role });

      const response = await request(app)
        .get("/api/workspaces/42/members")
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Workspace members retrieved",
        data: memberPage,
      });
      expect(findWorkspaceMembership).toHaveBeenCalledWith(
        42,
        authenticatedUser.id,
      );
      expect(getWorkspaceMembers).toHaveBeenCalledWith(42, 1, 20);
    },
  );

  it("passes a custom valid page and page size to the service", async () => {
    const response = await request(app)
      .get("/api/workspaces/42/members?page=2&pageSize=10")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(getWorkspaceMembers).toHaveBeenCalledWith(42, 2, 10);
  });

  it("returns the global server error response when member retrieval fails", async () => {
    vi.mocked(getWorkspaceMembers).mockRejectedValue(
      new Error("Database unavailable"),
    );

    const response = await request(app)
      .get("/api/workspaces/42/members")
      .set("Cookie", authCookie);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Something went wrong on our end",
    });
  });
});
