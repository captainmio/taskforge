import type { Response } from "express";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from "../config/pagination.js";
import {
  InvitationAcceptanceError,
  WorkspaceInvitationAlreadyExistsError,
  WorkspaceMemberAlreadyExistsError,
  type InvitationAcceptanceFailure,
  WorkspaceNameAlreadyExistsError,
} from "../errors/workspace.errors.js";
import {
  acceptWorkspaceInvitation as acceptWorkspaceInvitationService,
  createWorkspace as createWorkspaceService,
  getWorkspaceOverview as getWorkspaceOverviewService,
  getWorkspaceMembers as getWorkspaceMembersService,
  inviteWorkspaceMembers as inviteWorkspaceMembersService,
} from "../services/workspace.service.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";
import type {
  AcceptWorkspaceInvitationBody,
  CreateWorkspaceBody,
  InviteWorkspaceMembersBody,
  WorkspaceParams,
  WorkspaceOverviewParams,
  WorkspaceMembersQuery,
} from "../validations/workspace.validation.js";
import { createSuccessResponse } from "../utils/api-response.js";

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

export const inviteWorkspaceMembers = async (
  req: AuthenticatedRequest<InviteWorkspaceMembersBody, WorkspaceParams>,
  res: Response,
) => {
  try {
    const result = await inviteWorkspaceMembersService(
      Number(req.params.workspaceId),
      req.user.id,
      req.body,
    );

    return res
      .status(202)
      .json(createSuccessResponse("Workspace invitations queued", result));
  } catch (error) {
    if (error instanceof WorkspaceMemberAlreadyExistsError) {
      // Reject the whole list so the frontend can ask the user to remove the
      // existing member instead of reporting that only some emails were saved.
      return res.status(409).json({ success: false, error: error.message });
    }

    if (error instanceof WorkspaceInvitationAlreadyExistsError) {
      // A previous invitation for any email also rejects the complete request.
      // HTTP 409 tells the frontend that the request conflicts with saved data.
      return res.status(409).json({ success: false, error: error.message });
    }

    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};

export const getWorkspaceOverview = async (
  req: AuthenticatedRequest<unknown, WorkspaceOverviewParams>,
  res: Response,
) => {
  try {
    const members = await getWorkspaceOverviewService(
      Number(req.params.workspaceId),
    );

    return res
      .status(200)
      .json(createSuccessResponse("Workspace members retrieved", members));
  } catch {
    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};

export const getWorkspaceMembers = async (
  req: AuthenticatedRequest<unknown, WorkspaceParams, WorkspaceMembersQuery>,
  res: Response,
) => {
  try {
    const currentUserRole = req.workspaceMembership?.role;
    if (!currentUserRole) {
      // This route always runs the workspace-membership middleware first. Keep
      // this guard at the boundary so a future route cannot accidentally expose
      // member data without a verified membership context. Return the same
      // authorization response as the middleware instead of throwing a generic
      // error that would incorrectly describe the problem as a server failure.
      return res.status(403).json({
        success: false,
        error: "You do not have access to this workspace",
      });
    }

    // Query validation guarantees positive integer strings before this handler.
    // Defaults live in the shared pagination config for reuse by future lists.
    const page = req.query.page ? Number(req.query.page) : DEFAULT_PAGE;
    const pageSize = req.query.pageSize
      ? Number(req.query.pageSize)
      : DEFAULT_PAGE_SIZE;
    const result = await getWorkspaceMembersService(
      Number(req.params.workspaceId),
      page,
      pageSize,
    );

    return res.status(200).json(
      createSuccessResponse("Workspace members retrieved", {
        ...result,
        // Member pages are shared safely through Redis because the cached value
        // contains only list data. Add the requester-specific role after the
        // cache lookup so one user's permissions are never served to another.
        currentUserRole,
      }),
    );
  } catch {
    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};
