import jwt from "jsonwebtoken";
import request from "supertest";
import {
  InvitationAcceptanceError,
  WorkspaceInviteLinkGenerationForbiddenError,
} from "../../../src/errors/workspace.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import {
  acceptWorkspaceInviteLink,
  createWorkspaceInviteLink,
} from "../../../src/services/workspace.service.js";
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
    acceptWorkspaceInviteLink: vi.fn(),
    createWorkspaceInviteLink: vi.fn(),
  }),
);

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = { id: 7, email: "owner@example.com" };
const authCookie = `accessToken=${jwt.sign(
  { sub: authenticatedUser.id, email: authenticatedUser.email },
  "test-only-jwt-secret",
)}`;
const generatedLink = {
  invitationLink:
    "http://localhost:5173/invitations/accept?token=shared-token&type=link",
  expiresAt: "2026-08-29T00:00:00.000Z",
};

describe("POST /api/workspaces/:workspaceId/invitation-link", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "OWNER" });
    vi.mocked(createWorkspaceInviteLink).mockResolvedValue(generatedLink);
  });

  it("returns a generated link for an authorized workspace manager", async () => {
    const response = await request(app)
      .post("/api/workspaces/42/invitation-link")
      .set("Cookie", authCookie);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      message: "Workspace invitation link generated",
      data: generatedLink,
    });
    expect(findWorkspaceMembership).toHaveBeenCalledWith(42, 7);
    expect(createWorkspaceInviteLink).toHaveBeenCalledWith(42, 7, "OWNER");
  });

  it("returns 401 before checking membership when authentication is missing", async () => {
    const response = await request(app).post(
      "/api/workspaces/42/invitation-link",
    );

    expect(response.status).toBe(401);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(createWorkspaceInviteLink).not.toHaveBeenCalled();
  });

  it("returns 400 before checking membership when the workspace ID is invalid", async () => {
    const response = await request(app)
      .post("/api/workspaces/invalid/invitation-link")
      .set("Cookie", authCookie);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(createWorkspaceInviteLink).not.toHaveBeenCalled();
  });

  it("returns 403 when the user is not a workspace member", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue(null);

    const response = await request(app)
      .post("/api/workspaces/42/invitation-link")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe(
      "You do not have access to this workspace",
    );
    expect(createWorkspaceInviteLink).not.toHaveBeenCalled();
  });

  it("returns 403 when a workspace member is not allowed to generate links", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(createWorkspaceInviteLink).mockRejectedValue(
      new WorkspaceInviteLinkGenerationForbiddenError(),
    );

    const response = await request(app)
      .post("/api/workspaces/42/invitation-link")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe(
      "Only workspace owners and admins can generate invitation links",
    );
    expect(createWorkspaceInviteLink).toHaveBeenCalledWith(42, 7, "MEMBER");
  });

  it("returns 500 when link generation fails unexpectedly", async () => {
    vi.mocked(createWorkspaceInviteLink).mockRejectedValue(
      new Error("Database unavailable"),
    );

    const response = await request(app)
      .post("/api/workspaces/42/invitation-link")
      .set("Cookie", authCookie);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Something went wrong on our end");
  });
});

describe("POST /api/workspaces/invitation-links/accept", () => {
  beforeEach(() => {
    vi.mocked(acceptWorkspaceInviteLink).mockResolvedValue({
      id: 42,
      displayName: "Engineering Team",
    });
  });

  it("accepts a valid shared link for the authenticated user", async () => {
    const response = await request(app)
      .post("/api/workspaces/invitation-links/accept")
      .set("Cookie", authCookie)
      .send({ token: " shared-token " });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Invitation accepted",
      workspace: { id: 42, displayName: "Engineering Team" },
    });
    expect(acceptWorkspaceInviteLink).toHaveBeenCalledWith("shared-token", 7);
  });

  it("returns 401 when authentication is missing", async () => {
    const response = await request(app)
      .post("/api/workspaces/invitation-links/accept")
      .send({ token: "shared-token" });

    expect(response.status).toBe(401);
    expect(acceptWorkspaceInviteLink).not.toHaveBeenCalled();
  });

  it("returns 400 without calling the service when the token is empty", async () => {
    const response = await request(app)
      .post("/api/workspaces/invitation-links/accept")
      .set("Cookie", authCookie)
      .send({ token: "   " });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(acceptWorkspaceInviteLink).not.toHaveBeenCalled();
  });

  it.each([
    ["INVALID" as const, 400, "Invitation is invalid"],
    ["EXPIRED" as const, 410, "Invitation has expired"],
  ])("returns %s failures with status %i", async (reason, status, error) => {
    vi.mocked(acceptWorkspaceInviteLink).mockRejectedValue(
      new InvitationAcceptanceError(reason),
    );

    const response = await request(app)
      .post("/api/workspaces/invitation-links/accept")
      .set("Cookie", authCookie)
      .send({ token: "shared-token" });

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ success: false, error });
  });

  it("returns 500 when link acceptance fails unexpectedly", async () => {
    vi.mocked(acceptWorkspaceInviteLink).mockRejectedValue(
      new Error("Database unavailable"),
    );

    const response = await request(app)
      .post("/api/workspaces/invitation-links/accept")
      .set("Cookie", authCookie)
      .send({ token: "shared-token" });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Something went wrong on our end");
  });
});
