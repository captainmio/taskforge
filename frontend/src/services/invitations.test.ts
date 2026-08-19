import { beforeEach, describe, expect, it, vi } from "vitest";
import { inviteWorkspaceMembers } from "./invitations";

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
