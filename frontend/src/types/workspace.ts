import type { WorkspaceRole } from "./roles";

export const WorkspaceIcon = {
  CODE: "code",
  BUSINESS: "business",
  TEAM: "team",
  LAUNCH: "launch",
  GOALS: "goals",
} as const;

export type WorkspaceIcon =
  (typeof WorkspaceIcon)[keyof typeof WorkspaceIcon];

export interface WorkspaceInvite {
  email: string;
  role: WorkspaceRole | "";
}

// This is the single form shape shared by every workspace-creation step.
export interface WorkspaceFormValues {
  workspaceName: string;
  description: string;
  icon: WorkspaceIcon;
  invites: WorkspaceInvite[];
}
