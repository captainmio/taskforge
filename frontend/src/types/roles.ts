// Shared runtime values for workspace roles.
export const WorkspaceRole = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

// Derive the union "ADMIN" | "MEMBER" from the values above.
export type WorkspaceRole =
  (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

// Membership records can include the owner, while forms and role updates must
// continue using WorkspaceRole so they can only submit ADMIN or MEMBER.
export const WorkspaceMemberRole = {
  OWNER: "OWNER",
  ...WorkspaceRole,
} as const;

export type WorkspaceMemberRole =
  (typeof WorkspaceMemberRole)[keyof typeof WorkspaceMemberRole];

export const isWorkspaceOwner = (
  role: WorkspaceMemberRole | undefined,
): role is typeof WorkspaceMemberRole.OWNER =>
  role === WorkspaceMemberRole.OWNER;

export const isWorkspaceAdmin = (
  role: WorkspaceMemberRole | undefined,
): role is typeof WorkspaceMemberRole.ADMIN =>
  role === WorkspaceMemberRole.ADMIN;

export const isWorkspaceMember = (
  role: WorkspaceMemberRole | undefined,
): role is typeof WorkspaceMemberRole.MEMBER =>
  role === WorkspaceMemberRole.MEMBER;

export const canManageWorkspaceMembers = (
  role: WorkspaceMemberRole | undefined,
): boolean => isWorkspaceOwner(role) || isWorkspaceAdmin(role);

// Project creation follows the same workspace-level authority as member
// management: owners and admins may create projects, members may not.
export const canCreateWorkspaceProjects = (
  role: WorkspaceMemberRole | undefined,
): boolean => isWorkspaceOwner(role) || isWorkspaceAdmin(role);
