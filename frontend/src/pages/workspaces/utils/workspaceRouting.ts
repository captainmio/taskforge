import type { JoinedWorkspace } from "../../../services/auth";

export type WorkspaceDestination = `/workspace/${number}` | "/create-workspace";

export const getWorkspaceDestination = (
  workspaces: readonly JoinedWorkspace[],
): WorkspaceDestination => {
  return workspaces.length > 0
    ? `/workspace/${workspaces[0].id}`
    : "/create-workspace";
};
