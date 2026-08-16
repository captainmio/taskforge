import { findUserWithWorkspaceMembershipsById } from "../../../src/repositories/user.repository.js";
import { getCurrentUser } from "../../../src/services/auth.service.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/repositories/user.repository.js", () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserWithWorkspaceMembershipsById: vi.fn(),
}));

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.mocked(findUserWithWorkspaceMembershipsById).mockResolvedValue({
      id: 7,
      email: "owner@example.com",
      firstname: "Workspace",
      lastname: "Owner",
      workspaceMemberships: [{ workspaceId: 10 }, { workspaceId: 11 }],
    });
  });

  it("returns safe user details and the IDs of joined workspaces", async () => {
    await expect(getCurrentUser(7)).resolves.toEqual({
      user: {
        id: 7,
        email: "owner@example.com",
        firstname: "Workspace",
        lastname: "Owner",
      },
      workspaceIds: [10, 11],
    });
  });

  it("returns null when the authenticated user no longer exists", async () => {
    vi.mocked(findUserWithWorkspaceMembershipsById).mockResolvedValue(null);

    await expect(getCurrentUser(7)).resolves.toBeNull();
  });
});
