import type { WorkspaceMemberRole, WorkspaceRole } from "./roles";

export const WorkspaceIcon = {
  CODE: "code",
  BUSINESS: "business",
  TEAM: "team",
  LAUNCH: "launch",
  GOALS: "goals",
} as const;

export type WorkspaceIcon =
  (typeof WorkspaceIcon)[keyof typeof WorkspaceIcon];

export interface WorkspaceInviteFormValues {
  email: string;
  role: WorkspaceRole | "";
}

// This is the single form shape shared by every workspace-creation step.
export interface WorkspaceFormValues {
  workspaceName: string;
  description: string;
  icon: WorkspaceIcon;
  invites: WorkspaceInviteFormValues[];
}

export interface CreateWorkspaceInvite {
  email: string;
  role: WorkspaceRole;
}

// API payloads exclude the temporary empty values used while editing the form.
export interface CreateWorkspacePayload {
  workspaceName: string;
  description: string;
  icon: WorkspaceIcon;
  invites: CreateWorkspaceInvite[];
}

export interface WorkspaceMember {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: WorkspaceMemberRole;
  joinedAt: string;
}
