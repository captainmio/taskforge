export class WorkspaceNameAlreadyExistsError extends Error {
  constructor() {
    super("Workspace name already exists");
    this.name = "WorkspaceNameAlreadyExistsError";
  }
}

export class WorkspaceMemberAlreadyExistsError extends Error {
  constructor() {
    super("One or more email addresses already belong to this workspace");
    this.name = "WorkspaceMemberAlreadyExistsError";
  }
}

export class WorkspaceInvitationAlreadyExistsError extends Error {
  constructor() {
    super("One or more email addresses have already been invited");
    this.name = "WorkspaceInvitationAlreadyExistsError";
  }
}

export class WorkspaceMemberRemovalForbiddenError extends Error {
  constructor() {
    super("Only workspace owners and admins can remove members");
    this.name = "WorkspaceMemberRemovalForbiddenError";
  }
}

export class WorkspaceMemberNotFoundError extends Error {
  constructor() {
    super("Workspace member not found");
    this.name = "WorkspaceMemberNotFoundError";
  }
}

export class WorkspaceOwnerRemovalError extends Error {
  constructor() {
    super("The workspace owner cannot be removed");
    this.name = "WorkspaceOwnerRemovalError";
  }
}

export type InvitationAcceptanceFailure =
  | "INVALID"
  | "EXPIRED"
  | "ALREADY_USED"
  | "EMAIL_MISMATCH";

export class InvitationAcceptanceError extends Error {
  constructor(public readonly reason: InvitationAcceptanceFailure) {
    super(`Invitation cannot be accepted: ${reason}`);
    this.name = "InvitationAcceptanceError";
  }
}
