export class TaskAssigneeNotInWorkspaceError extends Error {
  constructor() {
    super("Each assignee must belong to this workspace");
    this.name = "TaskAssigneeNotInWorkspaceError";
  }
}

export class TaskNotFoundError extends Error {
  constructor() {
    super("Task not found");
    this.name = "TaskNotFoundError";
  }
}
