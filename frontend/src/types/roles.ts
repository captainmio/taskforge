// Shared runtime values for workspace roles.
export const WorkspaceRole = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

// Derive the union "ADMIN" | "MEMBER" from the values above.
export type WorkspaceRole =
  (typeof WorkspaceRole)[keyof typeof WorkspaceRole];
