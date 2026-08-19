import jwt from "jsonwebtoken";
import request from "supertest";
import {
  WorkspaceInvitationAlreadyExistsError,
  WorkspaceMemberAlreadyExistsError,
} from "../../../src/errors/workspace.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { inviteWorkspaceMembers } from "../../../src/services/workspace.service.js";
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
    inviteWorkspaceMembers: vi.fn(),
  }),
);

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = { id: 7, email: "member@example.com" };
const authCookie = `accessToken=${jwt.sign(
  { sub: authenticatedUser.id, email: authenticatedUser.email },
  "test-only-jwt-secret",
)}`;
const invitationBatch = {
  invitations: [
    { email: "admin@example.com", role: "ADMIN" },
    { email: "new-member@example.com", role: "MEMBER" },
  ],
};

describe("POST /api/workspaces/:workspaceId/invitations", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(inviteWorkspaceMembers).mockResolvedValue({ invitationCount: 2 });
  });

  it("returns 202 and passes normalized invitations to the service", async () => {
    const response = await request(app)
      .post("/api/workspaces/42/invitations")
      .set("Cookie", authCookie)
      .send({
        invitations: [
          { email: " ADMIN@Example.COM ", role: "ADMIN" },
          { email: "new-member@example.com", role: "MEMBER" },
        ],
      });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      success: true,
      message: "Workspace invitations queued",
      data: { invitationCount: 2 },
    });
    expect(findWorkspaceMembership).toHaveBeenCalledWith(42, 7);
    expect(inviteWorkspaceMembers).toHaveBeenCalledWith(42, 7, invitationBatch);
  });

  it("returns 401 without checking membership when authentication is missing", async () => {
    const response = await request(app)
      .post("/api/workspaces/42/invitations")
      .send(invitationBatch);

    expect(response.status).toBe(401);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(inviteWorkspaceMembers).not.toHaveBeenCalled();
  });

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "returns 400 without checking membership when workspace ID %s is invalid",
    async (workspaceId) => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/invitations`)
        .set("Cookie", authCookie)
        .send(invitationBatch);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
      expect(findWorkspaceMembership).not.toHaveBeenCalled();
      expect(inviteWorkspaceMembers).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["an empty batch", { invitations: [] }],
    [
      "duplicate emails",
      {
        invitations: [
          { email: "member@example.com", role: "MEMBER" },
          { email: "MEMBER@example.com", role: "ADMIN" },
        ],
      },
    ],
    [
      "an unsupported role",
      { invitations: [{ email: "member@example.com", role: "OWNER" }] },
    ],
  ])("returns 400 without calling the service for %s", async (_, body) => {
    const response = await request(app)
      .post("/api/workspaces/42/invitations")
      .set("Cookie", authCookie)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(inviteWorkspaceMembers).not.toHaveBeenCalled();
  });

  it("returns 403 without inviting anyone when the user is not a workspace member", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue(null);

    const response = await request(app)
      .post("/api/workspaces/42/invitations")
      .set("Cookie", authCookie)
      .send(invitationBatch);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: "You do not have access to this workspace",
    });
    expect(inviteWorkspaceMembers).not.toHaveBeenCalled();
  });

  it.each([
    [
      "an email already belongs to a member",
      new WorkspaceMemberAlreadyExistsError(),
      "One or more email addresses already belong to this workspace",
    ],
    [
      "an email was invited previously",
      new WorkspaceInvitationAlreadyExistsError(),
      "One or more email addresses have already been invited",
    ],
  ])("returns 409 when %s", async (_, serviceError, expectedMessage) => {
    vi.mocked(inviteWorkspaceMembers).mockRejectedValue(serviceError);

    const response = await request(app)
      .post("/api/workspaces/42/invitations")
      .set("Cookie", authCookie)
      .send(invitationBatch);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      error: expectedMessage,
    });
  });

  it("returns 500 when invitation creation fails unexpectedly", async () => {
    vi.mocked(inviteWorkspaceMembers).mockRejectedValue(
      new Error("Database unavailable"),
    );

    const response = await request(app)
      .post("/api/workspaces/42/invitations")
      .set("Cookie", authCookie)
      .send(invitationBatch);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Something went wrong on our end",
    });
  });
});
