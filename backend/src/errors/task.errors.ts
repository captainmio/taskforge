export class TaskAssigneeNotInWorkspaceError extends Error {
  constructor() {
    super("Each assignee must belong to this workspace");
    this.name = "TaskAssigneeNotInWorkspaceError";
  }
}
