import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptWorkspaceInviteLink,
  generateWorkspaceInviteLink,
  inviteWorkspaceMembers,
} from "./invitations";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock("./api", () => ({
  apiClient: { post: mocks.post },
}));

describe("inviteWorkspaceMembers", () => {
  beforeEach(() => {
    mocks.post.mockResolvedValue({
      data: {
        success: true,
        message: "Workspace invitations queued",
        data: { invitationCount: 2 },
      },
    });
  });

  it("posts the invitation batch and returns the complete API response", async () => {
    const payload = {
      invitations: [
        { email: "admin@example.com", role: "ADMIN" as const },
        { email: "member@example.com", role: "MEMBER" as const },
      ],
    };

    await expect(inviteWorkspaceMembers("42", payload)).resolves.toEqual({
      success: true,
      message: "Workspace invitations queued",
      data: { invitationCount: 2 },
    });
    expect(mocks.post).toHaveBeenCalledWith(
      "/workspaces/42/invitations",
      payload,
    );
  });
});

describe("generateWorkspaceInviteLink", () => {
  it("posts to the selected workspace and returns the generated link", async () => {
    const apiResponse = {
      success: true as const,
      message: "Workspace invitation link generated",
      data: {
        invitationLink:
          "http://localhost:5173/invitations/accept?token=shared-token&type=link",
        expiresAt: "2026-08-29T00:00:00.000Z",
      },
    };
    mocks.post.mockResolvedValue({ data: apiResponse });

    await expect(generateWorkspaceInviteLink("42")).resolves.toEqual(
      apiResponse,
    );
    expect(mocks.post).toHaveBeenCalledWith(
      "/workspaces/42/invitation-link",
    );
  });
});

describe("acceptWorkspaceInviteLink", () => {
  it("posts the shared token to the invitation-link acceptance endpoint", async () => {
    const apiResponse = {
      success: true,
      message: "Invitation accepted",
      workspace: { id: 42, displayName: "Engineering Team" },
    };
    mocks.post.mockResolvedValue({ data: apiResponse });

    await expect(acceptWorkspaceInviteLink("shared-token")).resolves.toEqual(
      apiResponse,
    );
    expect(mocks.post).toHaveBeenCalledWith(
      "/workspaces/invitation-links/accept",
      { token: "shared-token" },
    );
  });
});
