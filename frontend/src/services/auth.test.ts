import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, resendEmailVerification } from "./auth";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("./api", () => ({ apiClient: { get: mocks.get, post: mocks.post } }));

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

describe("resendEmailVerification", () => {
  it("posts the email address and returns the delivery response", async () => {
    mocks.post.mockResolvedValue({
      data: {
        success: true,
        message: "If an unverified account exists, a verification email has been sent",
      },
    });

    await expect(resendEmailVerification("ada@example.com")).resolves.toEqual({
      success: true,
      message: "If an unverified account exists, a verification email has been sent",
    });
    expect(mocks.post).toHaveBeenCalledWith("/auth/resend-verification", {
      email: "ada@example.com",
    });
  });
});
