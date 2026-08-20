import { describe, expect, it } from "vitest";
import {
  WorkspaceMemberRole,
  canManageWorkspaceMembers,
  isWorkspaceAdmin,
  isWorkspaceMember,
  isWorkspaceOwner,
} from "./roles";

describe("workspace role helpers", () => {
  it("identifies each workspace membership role", () => {
    expect(isWorkspaceOwner(WorkspaceMemberRole.OWNER)).toBe(true);
    expect(isWorkspaceOwner(WorkspaceMemberRole.ADMIN)).toBe(false);
    expect(isWorkspaceAdmin(WorkspaceMemberRole.ADMIN)).toBe(true);
    expect(isWorkspaceAdmin(WorkspaceMemberRole.MEMBER)).toBe(false);
    expect(isWorkspaceMember(WorkspaceMemberRole.MEMBER)).toBe(true);
    expect(isWorkspaceMember(WorkspaceMemberRole.OWNER)).toBe(false);
  });

  it("allows only owners and admins to manage workspace members", () => {
    expect(canManageWorkspaceMembers(WorkspaceMemberRole.OWNER)).toBe(true);
    expect(canManageWorkspaceMembers(WorkspaceMemberRole.ADMIN)).toBe(true);
    expect(canManageWorkspaceMembers(WorkspaceMemberRole.MEMBER)).toBe(false);
    expect(canManageWorkspaceMembers(undefined)).toBe(false);
  });
});
