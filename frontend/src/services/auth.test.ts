import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "./auth";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("./api", () => ({ apiClient: { get: mocks.get } }));

describe("getCurrentUser", () => {
  beforeEach(() => {
    mocks.get.mockResolvedValue({
      data: {
        success: true,
        user: {
          id: 7,
          email: "owner@example.com",
          firstname: "Workspace",
          lastname: "Owner",
        },
        workspaces: [
          { id: 42, name: "Engineering" },
          { id: 84, name: "Product" },
        ],
      },
    });
  });

  it("returns the authenticated user and joined workspace summaries", async () => {
    await expect(getCurrentUser()).resolves.toEqual({
      success: true,
      user: {
        id: 7,
        email: "owner@example.com",
        firstname: "Workspace",
        lastname: "Owner",
      },
      workspaces: [
        { id: 42, name: "Engineering" },
        { id: 84, name: "Product" },
      ],
    });
    expect(mocks.get).toHaveBeenCalledWith("/auth/me");
  });
});
