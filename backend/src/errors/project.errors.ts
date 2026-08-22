export class ProjectCreationForbiddenError extends Error {
  constructor() {
    super("Only workspace owners and admins can create projects");
    this.name = "ProjectCreationForbiddenError";
  }
}
