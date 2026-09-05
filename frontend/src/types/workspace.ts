import type { WorkspaceMemberRole, WorkspaceRole } from "./roles";

export const WorkspaceIcon = {
  CODE: "code",
  BUSINESS: "business",
  TEAM: "team",
  LAUNCH: "launch",
  GOALS: "goals",
} as const;

export type WorkspaceIcon = (typeof WorkspaceIcon)[keyof typeof WorkspaceIcon];

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

export type ProjectIcon =
  | "desktop"
  | "mobile"
  | "code"
  | "launch"
  | "flag"
  | "database"
  | "server"
  | "design"
  | "analytics"
  | "marketing"
  | "commerce"
  | "quality";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";

export type ProjectDefaultView = "list" | "board" | "calendar";

export interface WorkspaceProject {
  id: number;
  name: string;
  description: string;
  icon: ProjectIcon;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  defaultView: ProjectDefaultView;
  createdAt: string;
  taskCount: number;
  completedTaskCount: number;
}

export interface WorkspaceTaskSummary {
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
}

export interface WorkspaceRecentUpdate {
  id: number;
  action: string;
  changes: unknown;
  createdAt: string;
  actor: { id: number; firstname: string; lastname: string; email: string };
  task: { id: number; title: string; project: { id: number; name: string } };
}

export interface WorkspaceUpcomingTask {
  id: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string;
  timeEstimate: string | null;
  project: { id: number; name: string };
  assignees: Array<{ id: number; firstname: string; lastname: string; email: string }>;
}

export interface WorkspaceOverview {
  id: number;
  displayName: string;
  description: string;
  icon: WorkspaceIcon;
  createdAt: string;
  memberCount?: number;
  projects: WorkspaceProject[];
  taskSummary?: WorkspaceTaskSummary;
  recentUpdates?: WorkspaceRecentUpdate[];
}
