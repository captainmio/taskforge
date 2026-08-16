export class WorkspaceNameAlreadyExistsError extends Error {
  constructor() {
    super("Workspace name already exists");
    this.name = "WorkspaceNameAlreadyExistsError";
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
