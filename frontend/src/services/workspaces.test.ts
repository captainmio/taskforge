import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateWorkspaceMemberRole } from "./workspaces";

const mocks = vi.hoisted(() => ({
  patch: vi.fn(),
}));

vi.mock("./api", () => ({
  apiClient: {
    patch: mocks.patch,
  },
}));

describe("updateWorkspaceMemberRole", () => {
  beforeEach(() => {
    mocks.patch.mockResolvedValue({
      data: {
        success: true,
        message: "Workspace member role updated",
        data: {
          id: 8,
          firstname: "Taylor",
          lastname: "Member",
          email: "taylor@example.com",
          role: "ADMIN",
          joinedAt: "2026-08-20T00:00:00.000Z",
        },
      },
    });
  });

  it("patches the selected member role and returns the complete API response", async () => {
    await expect(
      updateWorkspaceMemberRole("42", 8, { role: "ADMIN" }),
    ).resolves.toEqual({
      success: true,
      message: "Workspace member role updated",
      data: {
        id: 8,
        firstname: "Taylor",
        lastname: "Member",
        email: "taylor@example.com",
        role: "ADMIN",
        joinedAt: "2026-08-20T00:00:00.000Z",
      },
    });
    expect(mocks.patch).toHaveBeenCalledWith(
      "/workspaces/42/members/8",
      { role: "ADMIN" },
    );
  });
});
