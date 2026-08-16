import jwt from "jsonwebtoken";
import request from "supertest";
import {
  InvitationAcceptanceError,
  WorkspaceNameAlreadyExistsError,
} from "../../../src/errors/workspace.errors.js";
import { WorkspaceIcon } from "../../../src/generated/prisma/enums.js";
import {
  acceptWorkspaceInvitation,
  createWorkspace,
} from "../../../src/services/workspace.service.js";
import { validWorkspace } from "../../helpers/workspace.fixture.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/services/workspace.service.js", () => ({
  acceptWorkspaceInvitation: vi.fn(),
  createWorkspace: vi.fn(),
  recoverPendingInvitationDeliveries: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const authCookie = `accessToken=${jwt.sign(
  { sub: 7, email: "owner@example.com" },
  "test-only-jwt-secret",
)}`;

const createdWorkspace = {
  id: 10,
  displayName: "Engineering Team",
  description: validWorkspace.description,
  icon: WorkspaceIcon.code,
};

describe("POST /api/workspaces", () => {
  beforeEach(() => {
    vi.mocked(createWorkspace).mockResolvedValue({
      workspace: createdWorkspace,
      invitationCount: 2,
    });
  });

  it("returns the created workspace and passes validated input to the service", async () => {
    const response = await request(app)
      .post("/api/workspaces")
      .set("Cookie", authCookie)
      .send({
        ...validWorkspace,
        workspaceName: " Engineering Team ",
        invites: [{ email: " ADMIN@Example.COM ", role: "ADMIN" }],
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      message: "Workspace created",
      workspace: createdWorkspace,
      invitationCount: 2,
    });
    expect(createWorkspace).toHaveBeenCalledWith(
      {
        ...validWorkspace,
        workspaceName: "Engineering Team",
        invites: [{ email: "admin@example.com", role: "ADMIN" }],
      },
      7,
    );
  });

  it("returns 401 without creating a workspace when authentication is missing", async () => {
    const response = await request(app)
      .post("/api/workspaces")
      .send(validWorkspace);

    expect(response.status).toBe(401);
    expect(createWorkspace).not.toHaveBeenCalled();
  });

  it("returns 400 without calling the service when invitation emails are duplicated", async () => {
    const response = await request(app)
      .post("/api/workspaces")
      .set("Cookie", authCookie)
      .send({
        ...validWorkspace,
        invites: [
          { email: "member@example.com", role: "MEMBER" },
          { email: "MEMBER@example.com", role: "ADMIN" },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(createWorkspace).not.toHaveBeenCalled();
  });

  it("returns 409 when the normalized workspace name already exists", async () => {
    vi.mocked(createWorkspace).mockRejectedValue(
      new WorkspaceNameAlreadyExistsError(),
    );

    const response = await request(app)
      .post("/api/workspaces")
      .set("Cookie", authCookie)
      .send(validWorkspace);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      error: "Workspace name already exists",
    });
  });

  it("returns 500 when workspace creation fails unexpectedly", async () => {
    vi.mocked(createWorkspace).mockRejectedValue(new Error("Database unavailable"));

    const response = await request(app)
      .post("/api/workspaces")
      .set("Cookie", authCookie)
      .send(validWorkspace);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Something went wrong on our end",
    });
  });
});

describe("POST /api/workspaces/invitations/accept", () => {
  beforeEach(() => {
    vi.mocked(acceptWorkspaceInvitation).mockResolvedValue({
      id: 10,
      displayName: "Engineering Team",
    });
  });

  it("accepts a valid token for the authenticated user and returns the workspace", async () => {
    const response = await request(app)
      .post("/api/workspaces/invitations/accept")
      .set("Cookie", authCookie)
      .send({ token: "verification-token" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Invitation accepted",
      workspace: { id: 10, displayName: "Engineering Team" },
    });
    expect(acceptWorkspaceInvitation).toHaveBeenCalledWith(
      "verification-token",
      { id: 7, email: "owner@example.com" },
    );
  });

  it("returns 401 without accepting an invitation when authentication is missing", async () => {
    const response = await request(app)
      .post("/api/workspaces/invitations/accept")
      .send({ token: "verification-token" });

    expect(response.status).toBe(401);
    expect(acceptWorkspaceInvitation).not.toHaveBeenCalled();
  });

  it("returns 400 without calling the service when the token is empty", async () => {
    const response = await request(app)
      .post("/api/workspaces/invitations/accept")
      .set("Cookie", authCookie)
      .send({ token: "   " });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(acceptWorkspaceInvitation).not.toHaveBeenCalled();
  });

  it.each([
    ["INVALID", 400, "Invitation is invalid"],
    ["EXPIRED", 410, "Invitation has expired"],
    ["ALREADY_USED", 409, "Invitation has already been used"],
    ["EMAIL_MISMATCH", 403, "Invitation belongs to a different email address"],
  ] as const)(
    "returns the expected response when invitation acceptance fails with %s",
    async (reason, status, errorMessage) => {
      vi.mocked(acceptWorkspaceInvitation).mockRejectedValue(
        new InvitationAcceptanceError(reason),
      );

      const response = await request(app)
        .post("/api/workspaces/invitations/accept")
        .set("Cookie", authCookie)
        .send({ token: "verification-token" });

      expect(response.status).toBe(status);
      expect(response.body).toEqual({ success: false, error: errorMessage });
    },
  );

  it("returns 500 when invitation acceptance fails unexpectedly", async () => {
    vi.mocked(acceptWorkspaceInvitation).mockRejectedValue(
      new Error("Database unavailable"),
    );

    const response = await request(app)
      .post("/api/workspaces/invitations/accept")
      .set("Cookie", authCookie)
      .send({ token: "verification-token" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Something went wrong on our end",
    });
  });
});
