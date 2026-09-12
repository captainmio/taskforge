import type { Logger } from "pino";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  WorkspaceDeletionConfirmationError,
  WorkspaceDeletionForbiddenError,
} from "../../../src/errors/workspace.errors.js";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
import { deleteWorkspace } from "../../../src/services/workspace.service.js";
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
    deleteWorkspace: vi.fn(),
  }),
);

const { default: app } = await import("../../../src/app.js");
const authCookie = `accessToken=${jwt.sign(
  { sub: 7, email: "owner@example.com" },
  "test-only-jwt-secret",
)}`;

describe("DELETE /api/workspaces/:workspaceId", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "OWNER" });
    vi.mocked(deleteWorkspace).mockResolvedValue(undefined);
  });

  it("allows an owner to permanently delete with the confirmed workspace name", async () => {
    const response = await request(app)
      .delete("/api/workspaces/42")
      .set("Cookie", authCookie)
      .send({ confirmationName: "Engineering Team" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "Workspace deleted", data: {} });
    expect(deleteWorkspace).toHaveBeenCalledWith(42, 7, "OWNER", "Engineering Team");
    expect(logMocks.info).toHaveBeenCalledWith(
      expect.objectContaining({ logType: "security", event: "workspace.deleted" }),
      "[SECURITY] Workspace permanently deleted",
    );
  });

  it("rejects non-members before deletion", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue(null);

    const response = await request(app)
      .delete("/api/workspaces/42")
      .set("Cookie", authCookie)
      .send({ confirmationName: "Engineering Team" });

    expect(response.status).toBe(403);
    expect(deleteWorkspace).not.toHaveBeenCalled();
  });

  it.each([
    [new WorkspaceDeletionForbiddenError(), 403],
    [new WorkspaceDeletionConfirmationError(), 400],
  ])("returns the expected deletion rejection", async (serviceError, status) => {
    vi.mocked(deleteWorkspace).mockRejectedValue(serviceError);

    const response = await request(app)
      .delete("/api/workspaces/42")
      .set("Cookie", authCookie)
      .send({ confirmationName: "Engineering Team" });

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ success: false, error: serviceError.message });
  });
});
