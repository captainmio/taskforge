import jwt from "jsonwebtoken";
import request from "supertest";
import { findWorkspaceMembership } from "../../../src/repositories/workspace.repository.js";
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

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = {
  id: 7,
  email: "member@example.com",
};
const authCookie = `accessToken=${jwt.sign(
  { sub: authenticatedUser.id, email: authenticatedUser.email },
  "test-only-jwt-secret",
)}`;

describe("POST /api/workspaces/:workspaceId/overview", () => {
  beforeEach(() => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue({ role: "MEMBER" });
  });

  it("returns 401 without checking membership when authentication is missing", async () => {
    const response = await request(app).post("/api/workspaces/42/overview");

    expect(response.status).toBe(401);
    expect(findWorkspaceMembership).not.toHaveBeenCalled();
  });

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "returns 400 without checking membership when workspace ID %s is invalid",
    async (workspaceId) => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/overview`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
      expect(findWorkspaceMembership).not.toHaveBeenCalled();
    },
  );

  it("returns 403 without protected content when the user is not a workspace member", async () => {
    vi.mocked(findWorkspaceMembership).mockResolvedValue(null);

    const response = await request(app)
      .post("/api/workspaces/42/overview")
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
        .post("/api/workspaces/42/overview")
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: [] });
      expect(findWorkspaceMembership).toHaveBeenCalledWith(
        42,
        authenticatedUser.id,
      );
    },
  );
});
