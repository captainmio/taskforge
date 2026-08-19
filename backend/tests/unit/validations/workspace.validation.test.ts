import { describe, expect, it } from "vitest";
import { validWorkspace } from "../../helpers/workspace.fixture.js";
import {
  acceptWorkspaceInvitationSchema,
  createWorkspaceSchema,
  inviteWorkspaceMembersSchema,
} from "../../../src/validations/workspace.validation.js";

describe("createWorkspaceSchema", () => {
  it("normalizes invitation emails when the workspace input is valid", () => {
    const result = createWorkspaceSchema.safeParse({
      body: {
        ...validWorkspace,
        invites: [{ email: " ADMIN@Example.COM ", role: "ADMIN" }],
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.invites[0]?.email).toBe("admin@example.com");
    }
  });

  it("rejects duplicate invitation emails regardless of capitalization", () => {
    const result = createWorkspaceSchema.safeParse({
      body: {
        ...validWorkspace,
        invites: [
          { email: "member@example.com", role: "MEMBER" },
          { email: "MEMBER@example.com", role: "ADMIN" },
        ],
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ["body", "invites", 1, "email"],
          message: "Each email address can only be invited once",
        }),
      );
    }
  });

  it("rejects requests containing more than 500 invitations", () => {
    const result = createWorkspaceSchema.safeParse({
      body: {
        ...validWorkspace,
        invites: Array.from({ length: 501 }, (_, index) => ({
          email: `member-${index}@example.com`,
          role: "MEMBER",
        })),
      },
    });

    expect(result.success).toBe(false);
  });
});

describe("acceptWorkspaceInvitationSchema", () => {
  it("trims a verification token when the acceptance input is valid", () => {
    const result = acceptWorkspaceInvitationSchema.safeParse({
      body: { token: "  verification-token  " },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.token).toBe("verification-token");
    }
  });

  it("rejects an empty verification token", () => {
    const result = acceptWorkspaceInvitationSchema.safeParse({
      body: { token: "   " },
    });

    expect(result.success).toBe(false);
  });
});

describe("inviteWorkspaceMembersSchema", () => {
  it("normalizes invitation emails when the batch is valid", () => {
    const result = inviteWorkspaceMembersSchema.safeParse({
      params: { workspaceId: "42" },
      body: {
        invitations: [{ email: " MEMBER@Example.COM ", role: "MEMBER" }],
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.invitations[0]?.email).toBe(
        "member@example.com",
      );
    }
  });

  it("rejects an empty invitation batch", () => {
    const result = inviteWorkspaceMembersSchema.safeParse({
      params: { workspaceId: "42" },
      body: { invitations: [] },
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate emails regardless of capitalization", () => {
    const result = inviteWorkspaceMembersSchema.safeParse({
      params: { workspaceId: "42" },
      body: {
        invitations: [
          { email: "member@example.com", role: "MEMBER" },
          { email: "MEMBER@example.com", role: "ADMIN" },
        ],
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ["body", "invitations", 1, "email"],
          message: "Each email address can only be invited once",
        }),
      );
    }
  });

  it.each([
    {
      name: "an invalid email address",
      invitations: [{ email: "not-an-email", role: "MEMBER" }],
    },
    {
      name: "an unsupported role",
      invitations: [{ email: "member@example.com", role: "OWNER" }],
    },
    {
      name: "more than 500 invitations",
      invitations: Array.from({ length: 501 }, (_, index) => ({
        email: `member-${index}@example.com`,
        role: "MEMBER",
      })),
    },
  ])("rejects $name", ({ invitations }) => {
    const result = inviteWorkspaceMembersSchema.safeParse({
      params: { workspaceId: "42" },
      body: { invitations },
    });

    expect(result.success).toBe(false);
  });
});
