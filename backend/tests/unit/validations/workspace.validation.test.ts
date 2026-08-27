import { describe, expect, it } from "vitest";
import { validWorkspace } from "../../helpers/workspace.fixture.js";
import {
  acceptWorkspaceInvitationSchema,
  createWorkspaceInviteLinkSchema,
  createWorkspaceSchema,
  inviteWorkspaceMembersSchema,
  removeWorkspaceMemberSchema,
  updateWorkspaceMemberRoleSchema,
  workspaceMembersSchema,
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

describe("createWorkspaceInviteLinkSchema", () => {
  it("accepts a positive workspace ID", () => {
    const result = createWorkspaceInviteLinkSchema.safeParse({
      params: { workspaceId: "42" },
    });

    expect(result.success).toBe(true);
  });

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "rejects invalid workspace ID %s",
    (workspaceId) => {
      const result = createWorkspaceInviteLinkSchema.safeParse({
        params: { workspaceId },
      });

      expect(result.success).toBe(false);
    },
  );
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

describe("workspaceMembersSchema", () => {
  it("accepts omitted pagination values so the controller can use global defaults", () => {
    const result = workspaceMembersSchema.safeParse({
      params: { workspaceId: "42" },
      query: {},
    });

    expect(result.success).toBe(true);
  });

  it("accepts positive pagination values up to the global maximum page size", () => {
    const result = workspaceMembersSchema.safeParse({
      params: { workspaceId: "42" },
      query: { page: "2", pageSize: "100" },
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ["page zero", { page: "0" }],
    ["a negative page", { page: "-1" }],
    ["a decimal page", { page: "1.5" }],
    ["a non-numeric page", { page: "next" }],
    ["an unsafe page", { page: "9007199254740992" }],
    ["page size zero", { pageSize: "0" }],
    ["a page size above 100", { pageSize: "101" }],
  ])("rejects %s", (_, query) => {
    const result = workspaceMembersSchema.safeParse({
      params: { workspaceId: "42" },
      query,
    });

    expect(result.success).toBe(false);
  });
});

describe("removeWorkspaceMemberSchema", () => {
  it("accepts positive workspace and member IDs", () => {
    const result = removeWorkspaceMemberSchema.safeParse({
      params: { workspaceId: "42", memberId: "7" },
    });

    expect(result.success).toBe(true);
  });

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "rejects invalid workspace ID %s",
    (workspaceId) => {
      const result = removeWorkspaceMemberSchema.safeParse({
        params: { workspaceId, memberId: "7" },
      });

      expect(result.success).toBe(false);
    },
  );

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "rejects invalid member ID %s",
    (memberId) => {
      const result = removeWorkspaceMemberSchema.safeParse({
        params: { workspaceId: "42", memberId },
      });

      expect(result.success).toBe(false);
    },
  );
});

describe("updateWorkspaceMemberRoleSchema", () => {
  it.each(["ADMIN", "MEMBER"])("accepts the supported %s role", (role) => {
    const result = updateWorkspaceMemberRoleSchema.safeParse({
      params: { workspaceId: "42", memberId: "7" },
      body: { role },
    });

    expect(result.success).toBe(true);
  });

  it.each(["OWNER", "VIEWER", "", undefined])(
    "rejects the unsupported role %s",
    (role) => {
      const result = updateWorkspaceMemberRoleSchema.safeParse({
        params: { workspaceId: "42", memberId: "7" },
        body: { role },
      });

      expect(result.success).toBe(false);
    },
  );

  it("rejects unexpected body fields", () => {
    const result = updateWorkspaceMemberRoleSchema.safeParse({
      params: { workspaceId: "42", memberId: "7" },
      body: { role: "ADMIN", owner: true },
    });

    expect(result.success).toBe(false);
  });

  it.each(["0", "-1", "1.5", "invalid", "9007199254740992"])(
    "rejects invalid member ID %s",
    (memberId) => {
      const result = updateWorkspaceMemberRoleSchema.safeParse({
        params: { workspaceId: "42", memberId },
        body: { role: "MEMBER" },
      });

      expect(result.success).toBe(false);
    },
  );
});
