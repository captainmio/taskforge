import type { Response } from "express";
import {
  InvitationAcceptanceError,
  type InvitationAcceptanceFailure,
  WorkspaceNameAlreadyExistsError,
} from "../errors/workspace.errors.js";
import {
  acceptWorkspaceInvitation as acceptWorkspaceInvitationService,
  createWorkspace as createWorkspaceService,
} from "../services/workspace.service.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";
import type {
  AcceptWorkspaceInvitationBody,
  CreateWorkspaceBody,
} from "../validations/workspace.validation.js";

const invitationFailureResponses: Record<
  InvitationAcceptanceFailure,
  { status: number; error: string }
> = {
  INVALID: { status: 400, error: "Invitation is invalid" },
  EXPIRED: { status: 410, error: "Invitation has expired" },
  ALREADY_USED: { status: 409, error: "Invitation has already been used" },
  EMAIL_MISMATCH: {
    status: 403,
    error: "Invitation belongs to a different email address",
  },
};

export const createWorkspace = async (
  req: AuthenticatedRequest<CreateWorkspaceBody>,
  res: Response,
) => {
  try {
    const result = await createWorkspaceService(req.body, req.user.id);

    return res.status(201).json({
      success: true,
      message: "Workspace created",
      workspace: result.workspace,
      invitationCount: result.invitationCount,
    });
  } catch (error) {
    if (error instanceof WorkspaceNameAlreadyExistsError) {
      return res.status(409).json({
        success: false,
        error: "Workspace name already exists",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};

export const acceptWorkspaceInvitation = async (
  req: AuthenticatedRequest<AcceptWorkspaceInvitationBody>,
  res: Response,
) => {
  try {
    const workspace = await acceptWorkspaceInvitationService(
      req.body.token,
      req.user,
    );

    return res.status(200).json({
      success: true,
      message: "Invitation accepted",
      workspace,
    });
  } catch (error) {
    if (error instanceof InvitationAcceptanceError) {
      const response = invitationFailureResponses[error.reason];
      return res.status(response.status).json({
        success: false,
        error: response.error,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};
