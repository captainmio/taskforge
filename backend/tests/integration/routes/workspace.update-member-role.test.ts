import jwt from "jsonwebtoken";
import request from "supertest";
import {
  WorkspaceMemberNotFoundError,
  WorkspaceMemberRoleUpdateForbiddenError,
  WorkspaceMemberSelfRoleUpdateError,
  WorkspaceOwnerRoleUpdateError,
} from "../../../src/errors/workspace.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { updateWorkspaceMemberRole } from "../../../src/services/workspace.service.js";
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
    updateWorkspaceMemberRole: vi.fn(),
  }),
);

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = { id: 7, email: "manager@example.com" };
const authCookie = `accessToken=${jwt.sign(
  { sub: authenticatedUser.id, email: authenticatedUser.email },
  "test-only-jwt-secret",
)}`;
const updatedMember = {
  id: 8,
  firstname: "Taylor",
  lastname: "Member",
  email: "taylor@example.com",
  role: "ADMIN" as const,
  joinedAt: "2026-08-20T00:00:00.000Z",
};

describe("PATCH /api/workspaces/:workspaceId/members/:memberId", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "OWNER" });
    vi.mocked(updateWorkspaceMemberRole).mockResolvedValue({
      member: updatedMember,
      previousRole: "MEMBER",
    });
  });

  it("returns 401 before checking membership when authentication is missing", async () => {
    const response = await request(app)
      .patch("/api/workspaces/42/members/8")
      .send({ role: "ADMIN" });

    expect(response.status).toBe(401);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(updateWorkspaceMemberRole).not.toHaveBeenCalled();
  });

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "returns 400 before checking membership when workspace ID %s is invalid",
    async (workspaceId) => {
      const response = await request(app)
        .patch(`/api/workspaces/${workspaceId}/members/8`)
        .set("Cookie", authCookie)
        .send({ role: "ADMIN" });

      expect(response.status).toBe(400);
      expect(findWorkspaceMembership).not.toHaveBeenCalled();
      expect(updateWorkspaceMemberRole).not.toHaveBeenCalled();
    },
  );

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "returns 400 before checking membership when member ID %s is invalid",
    async (memberId) => {
      const response = await request(app)
        .patch(`/api/workspaces/42/members/${memberId}`)
        .set("Cookie", authCookie)
        .send({ role: "ADMIN" });

      expect(response.status).toBe(400);
      expect(findWorkspaceMembership).not.toHaveBeenCalled();
      expect(updateWorkspaceMemberRole).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["a missing role", {}],
    ["the owner role", { role: "OWNER" }],
    ["an unsupported role", { role: "VIEWER" }],
    ["an unexpected field", { role: "ADMIN", owner: true }],
  ])("returns 400 before checking membership for %s", async (_, body) => {
    const response = await request(app)
      .patch("/api/workspaces/42/members/8")
      .set("Cookie", authCookie)
      .send(body);

    expect(response.status).toBe(400);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(updateWorkspaceMemberRole).not.toHaveBeenCalled();
  });

  it("returns 403 before updating when the requester is not a workspace member", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/workspaces/42/members/8")
      .set("Cookie", authCookie)
      .send({ role: "ADMIN" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: "You do not have access to this workspace",
    });
    expect(updateWorkspaceMemberRole).not.toHaveBeenCalled();
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "allows a workspace %s to update another member's role",
    async (actorRole) => {
      vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: actorRole });

      const response = await request(app)
        .patch("/api/workspaces/42/members/8")
        .set("Cookie", authCookie)
        .send({ role: "ADMIN" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Workspace member role updated",
        data: updatedMember,
      });
      expect(updateWorkspaceMemberRole).toHaveBeenCalledWith(
        42,
        8,
        authenticatedUser.id,
        actorRole,
        "ADMIN",
      );
    },
  );

  it.each([
    [
      "a regular member attempts the update",
      new WorkspaceMemberRoleUpdateForbiddenError(),
      403,
    ],
    [
      "the requester targets their own membership",
      new WorkspaceMemberSelfRoleUpdateError(),
      403,
    ],
    ["the target member does not exist", new WorkspaceMemberNotFoundError(), 404],
    ["the target is the workspace owner", new WorkspaceOwnerRoleUpdateError(), 409],
  ])("returns the expected rejection when %s", async (_, serviceError, status) => {
    vi.mocked(updateWorkspaceMemberRole).mockRejectedValue(serviceError);

    const response = await request(app)
      .patch("/api/workspaces/42/members/8")
      .set("Cookie", authCookie)
      .send({ role: "MEMBER" });

    expect(response.status).toBe(status);
    expect(response.body).toEqual({
      success: false,
      error: serviceError.message,
    });
  });

  it("returns 500 when the service encounters an unexpected failure", async () => {
    vi.mocked(updateWorkspaceMemberRole).mockRejectedValue(
      new Error("Database unavailable"),
    );

    const response = await request(app)
      .patch("/api/workspaces/42/members/8")
      .set("Cookie", authCookie)
      .send({ role: "MEMBER" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Something went wrong on our end",
    });
  });
});
