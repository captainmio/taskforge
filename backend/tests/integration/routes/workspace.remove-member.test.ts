import type { Logger } from "pino";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  WorkspaceMemberNotFoundError,
  WorkspaceMemberRemovalForbiddenError,
  WorkspaceOwnerRemovalError,
} from "../../../src/errors/workspace.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { removeWorkspaceMember } from "../../../src/services/workspace.service.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const logMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../../../src/middlewares/httpLogger.js", () => ({
  httpLogger: (
    req: { log: Logger },
    _res: unknown,
    next: () => void,
  ) => {
    req.log = logMocks as unknown as Logger;
    next();
  },
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

vi.mock(
  "../../../src/services/workspace.service.js",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../../src/services/workspace.service.js")
    >()),
    removeWorkspaceMember: vi.fn(),
  }),
);

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = { id: 7, email: "manager@example.com" };
const authCookie = `accessToken=${jwt.sign(
  { sub: authenticatedUser.id, email: authenticatedUser.email },
  "test-only-jwt-secret",
)}`;

describe("DELETE /api/workspaces/:workspaceId/members/:memberId", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "OWNER" });
    vi.mocked(removeWorkspaceMember).mockResolvedValue({
      memberId: 8,
      previousRole: "MEMBER",
    });
  });

  it("returns 401 before checking membership when authentication is missing", async () => {
    const response = await request(app).delete(
      "/api/workspaces/42/members/8",
    );

    expect(response.status).toBe(401);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
    expect(removeWorkspaceMember).not.toHaveBeenCalled();
  });

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "returns 400 before checking membership when workspace ID %s is invalid",
    async (workspaceId) => {
      const response = await request(app)
        .delete(`/api/workspaces/${workspaceId}/members/8`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(400);
      expect(findWorkspaceMembership).not.toHaveBeenCalled();
      expect(removeWorkspaceMember).not.toHaveBeenCalled();
    },
  );

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "returns 400 before checking membership when member ID %s is invalid",
    async (memberId) => {
      const response = await request(app)
        .delete(`/api/workspaces/42/members/${memberId}`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(400);
      expect(findWorkspaceMembership).not.toHaveBeenCalled();
      expect(removeWorkspaceMember).not.toHaveBeenCalled();
    },
  );

  it("returns 403 before deletion when the requester is not a workspace member", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue(null);

    const response = await request(app)
      .delete("/api/workspaces/42/members/8")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: "You do not have access to this workspace",
    });
    expect(removeWorkspaceMember).not.toHaveBeenCalled();
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "allows a workspace %s and logs the successful removal without personal data",
    async (role) => {
      vi.mocked(findWorkspaceMembership).mockResolvedValue({ role });

      const response = await request(app)
        .delete("/api/workspaces/42/members/8")
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Workspace member removed",
        data: { memberId: 8 },
      });
      expect(removeWorkspaceMember).toHaveBeenCalledWith(42, 8, role);
      expect(logMocks.info).toHaveBeenCalledWith(
        {
          event: "workspace.member_removed",
          previousRole: "MEMBER",
          workspaceId: 42,
          actorUserId: 7,
          targetUserId: 8,
        },
        "Workspace member removed",
      );
      const loggedFields = logMocks.info.mock.calls[0]?.[0];
      expect(loggedFields).not.toHaveProperty("email");
      expect(loggedFields).not.toHaveProperty("token");
    },
  );

  it.each([
    [
      "a regular member attempts removal",
      new WorkspaceMemberRemovalForbiddenError(),
      403,
    ],
    ["the target member does not exist", new WorkspaceMemberNotFoundError(), 404],
    ["the target is the workspace owner", new WorkspaceOwnerRemovalError(), 409],
  ])("returns the expected rejection when %s", async (_, serviceError, status) => {
    vi.mocked(removeWorkspaceMember).mockRejectedValue(serviceError);

    const response = await request(app)
      .delete("/api/workspaces/42/members/8")
      .set("Cookie", authCookie);

    expect(response.status).toBe(status);
    expect(response.body).toEqual({
      success: false,
      error: serviceError.message,
    });
    expect(logMocks.warn).toHaveBeenCalledWith(
      {
        event: "workspace.member_removal_rejected",
        reason: serviceError.name,
        workspaceId: 42,
        actorUserId: 7,
        targetUserId: 8,
      },
      "Workspace member removal rejected",
    );
  });

  it("returns 500 and logs the original unexpected error", async () => {
    const serviceError = new Error("Database unavailable");
    vi.mocked(removeWorkspaceMember).mockRejectedValue(serviceError);

    const response = await request(app)
      .delete("/api/workspaces/42/members/8")
      .set("Cookie", authCookie);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Something went wrong on our end",
    });
    expect(logMocks.error).toHaveBeenCalledWith(
      {
        event: "workspace.member_removal_failed",
        err: serviceError,
        workspaceId: 42,
        actorUserId: 7,
        targetUserId: 8,
      },
      "Unable to remove workspace member",
    );
  });
});
