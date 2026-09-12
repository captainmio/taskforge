import type { Logger } from "pino";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  WorkspaceMemberNotFoundError,
  WorkspaceOwnerLeaveError,
} from "../../../src/errors/workspace.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { leaveWorkspace } from "../../../src/services/workspace.service.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const logMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setBindings: vi.fn(),
}));

vi.mock("../../../src/middlewares/httpLogger.js", () => ({
  httpLogger: (req: { log: Logger }, _res: unknown, next: () => void) => {
    req.log = logMocks as unknown as Logger;
    next();
  },
}));

vi.mock(
  "../../../src/repositories/workspace.repository.js",
  async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../../src/repositories/workspace.repository.js")>()),
    findWorkspaceMembership: vi.fn(),
  }),
);

vi.mock(
  "../../../src/services/workspace.service.js",
  async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../../src/services/workspace.service.js")>()),
    leaveWorkspace: vi.fn(),
  }),
);

const { default: app } = await import("../../../src/app.js");
const authCookie = `accessToken=${jwt.sign(
  { sub: 7, email: "member@example.com" },
  "test-only-jwt-secret",
)}`;

describe("POST /api/workspaces/:workspaceId/leave", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
    vi.mocked(leaveWorkspace).mockResolvedValue({ previousRole: "MEMBER" });
  });

  it("allows an authenticated member to leave their own workspace", async () => {
    const response = await request(app)
      .post("/api/workspaces/42/leave")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "Left workspace", data: {} });
    expect(leaveWorkspace).toHaveBeenCalledWith(42, 7, "MEMBER");
    expect(logMocks.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "workspace.member_left", workspaceId: 42, actorUserId: 7 }),
      "[FEATURE] Workspace member left",
    );
  });

  it("rejects a requester who is not a member", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue(null);

    const response = await request(app)
      .post("/api/workspaces/42/leave")
      .set("Cookie", authCookie);

    expect(response.status).toBe(403);
    expect(leaveWorkspace).not.toHaveBeenCalled();
  });

  it.each([
    [new WorkspaceOwnerLeaveError(), 409],
    [new WorkspaceMemberNotFoundError(), 404],
  ])("returns the service rejection", async (serviceError, status) => {
    vi.mocked(leaveWorkspace).mockRejectedValue(serviceError);

    const response = await request(app)
      .post("/api/workspaces/42/leave")
      .set("Cookie", authCookie);

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ success: false, error: serviceError.message });
  });
});
