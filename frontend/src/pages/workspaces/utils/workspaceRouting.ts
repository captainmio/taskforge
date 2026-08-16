export type WorkspaceDestination = `/workspace/${number}` | "/create-workspace";

export const getWorkspaceDestination = (
  workspaceIds: readonly number[]
): WorkspaceDestination => {
  return workspaceIds.length > 0
    ? `/workspace/${workspaceIds[0]}`
    : "/create-workspace";
};
