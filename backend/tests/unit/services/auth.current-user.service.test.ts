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
      workspaceMemberships: [
        { role: "OWNER", workspace: { id: 10, displayName: "Engineering" } },
        { role: "MEMBER", workspace: { id: 11, displayName: "Product" } },
      ],
    });
  });

  it("returns safe user details and summaries of joined workspaces", async () => {
    await expect(getCurrentUser(7)).resolves.toEqual({
      user: {
        id: 7,
        email: "owner@example.com",
        firstname: "Workspace",
        lastname: "Owner",
      },
      workspaces: [
        { id: 10, name: "Engineering", role: "OWNER" },
        { id: 11, name: "Product", role: "MEMBER" },
      ],
    });
  });

  it("returns an empty workspace list when the user has no memberships", async () => {
    vi.mocked(findUserWithWorkspaceMembershipsById).mockResolvedValue({
      id: 7,
      email: "owner@example.com",
      firstname: "Workspace",
      lastname: "Owner",
      workspaceMemberships: [],
    });

    await expect(getCurrentUser(7)).resolves.toEqual({
      user: {
        id: 7,
        email: "owner@example.com",
        firstname: "Workspace",
        lastname: "Owner",
      },
      workspaces: [],
    });
  });

  it("returns null when the authenticated user no longer exists", async () => {
    vi.mocked(findUserWithWorkspaceMembershipsById).mockResolvedValue(null);

    await expect(getCurrentUser(7)).resolves.toBeNull();
  });
});
