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

export class TaskCompletionForbiddenError extends Error {
  constructor() {
    super("Only workspace owners and admins can move a task from In Review to Done");
    this.name = "TaskCompletionForbiddenError";
  }
}
