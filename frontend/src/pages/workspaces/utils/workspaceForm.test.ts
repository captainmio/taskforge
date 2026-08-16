import { describe, expect, it } from "vitest";
import { WorkspaceRole } from "../../../types/roles";
import { WorkspaceIcon } from "../../../types/workspace";
import {
  createWorkspacePayload,
  getCompleteWorkspaceInvites,
} from "./workspaceForm";

describe("workspace form utilities", () => {
  it("keeps only complete invites and normalizes their email addresses", () => {
    expect(
      getCompleteWorkspaceInvites([
        { email: " DEV@Example.COM ", role: WorkspaceRole.ADMIN },
        { email: "", role: "" },
      ])
    ).toEqual([{ email: "dev@example.com", role: WorkspaceRole.ADMIN }]);
  });

  it("builds a normalized API payload from form values", () => {
    expect(
      createWorkspacePayload({
        workspaceName: "  Product Team  ",
        description: "  Product delivery workspace.  ",
        icon: WorkspaceIcon.TEAM,
        invites: [{ email: " MEMBER@Example.com ", role: WorkspaceRole.MEMBER }],
      })
    ).toEqual({
      workspaceName: "Product Team",
      description: "Product delivery workspace.",
      icon: WorkspaceIcon.TEAM,
      invites: [{ email: "member@example.com", role: WorkspaceRole.MEMBER }],
    });
  });
});
