export type WorkspaceDestination = "/dashboard" | "/create-workspace";

export const getWorkspaceDestination = (
  workspaceIds: readonly number[]
): WorkspaceDestination => {
  return workspaceIds.length > 0 ? "/dashboard" : "/create-workspace";
};
