export class ProjectCreationForbiddenError extends Error {
  constructor() {
    super("Only workspace owners and admins can create projects");
    this.name = "ProjectCreationForbiddenError";
  }
}

export class ProjectDeletionForbiddenError extends Error {
  constructor() {
    super("Only workspace owners and admins can delete projects");
    this.name = "ProjectDeletionForbiddenError";
  }
}

export class ProjectUpdateForbiddenError extends Error {
  constructor() {
    super("Only workspace owners and admins can update projects");
    this.name = "ProjectUpdateForbiddenError";
  }
}

export class ProjectNotFoundError extends Error {
  constructor() {
    super("Project not found");
    this.name = "ProjectNotFoundError";
  }
}

export class ProjectRestoreForbiddenError extends Error {
  constructor() {
    super("Only the workspace owner can restore projects");
    this.name = "ProjectRestoreForbiddenError";
  }
}
