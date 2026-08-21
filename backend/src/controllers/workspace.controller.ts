import type { Response } from "express";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from "../config/pagination.js";
import {
  InvitationAcceptanceError,
  WorkspaceInvitationAlreadyExistsError,
  WorkspaceMemberAlreadyExistsError,
  WorkspaceMemberNotFoundError,
  WorkspaceMemberRemovalForbiddenError,
  WorkspaceMemberRoleUpdateForbiddenError,
  WorkspaceMemberSelfRoleUpdateError,
  type InvitationAcceptanceFailure,
  WorkspaceNameAlreadyExistsError,
  WorkspaceOwnerRemovalError,
  WorkspaceOwnerRoleUpdateError,
} from "../errors/workspace.errors.js";
import {
  acceptWorkspaceInvitation as acceptWorkspaceInvitationService,
  createWorkspace as createWorkspaceService,
  getWorkspaceOverview as getWorkspaceOverviewService,
  getWorkspaceMembers as getWorkspaceMembersService,
  inviteWorkspaceMembers as inviteWorkspaceMembersService,
  removeWorkspaceMember as removeWorkspaceMemberService,
  updateWorkspaceMemberRole as updateWorkspaceMemberRoleService,
} from "../services/workspace.service.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";
import type {
  AcceptWorkspaceInvitationBody,
  CreateWorkspaceBody,
  InviteWorkspaceMembersBody,
  WorkspaceParams,
  WorkspaceOverviewParams,
  WorkspaceMembersQuery,
  RemoveWorkspaceMemberParams,
  UpdateWorkspaceMemberRoleBody,
  UpdateWorkspaceMemberRoleParams,
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

    req.log.info(
      {
        logType: "feature",
        event: "workspace.invitation_accepted",
        workspaceId: workspace.id,
        actorUserId: req.user.id,
      },
      "[FEATURE] Workspace invitation accepted",
    );

    return res.status(200).json({
      success: true,
      message: "Invitation accepted",
      workspace,
    });
  } catch (error) {
    if (error instanceof InvitationAcceptanceError) {
      const response = invitationFailureResponses[error.reason];
      req.log.warn(
        {
          logType: "feature",
          event: "workspace.invitation_acceptance_rejected",
          reason: error.reason,
          actorUserId: req.user.id,
        },
        "[FEATURE] Workspace invitation acceptance rejected",
      );
      return res.status(response.status).json({
        success: false,
        error: response.error,
      });
    }

    req.log.error(
      {
        logType: "feature",
        event: "workspace.invitation_acceptance_failed",
        err: error,
        actorUserId: req.user.id,
      },
      "[FEATURE] Unable to accept workspace invitation",
    );
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
  const workspaceId = Number(req.params.workspaceId);
  const logContext = {
    workspaceId,
    actorUserId: req.user.id,
    invitationCount: req.body.invitations.length,
  };

  try {
    const result = await inviteWorkspaceMembersService(
      workspaceId,
      req.user.id,
      req.body,
    );

    req.log.info(
      {
        logType: "feature",
        event: "workspace.invitations_queued",
        ...logContext,
        invitationCount: result.invitationCount,
      },
      "[FEATURE] Workspace invitations queued",
    );

    return res
      .status(202)
      .json(createSuccessResponse("Workspace invitations queued", result));
  } catch (error) {
    if (error instanceof WorkspaceMemberAlreadyExistsError) {
      // Reject the whole list so the frontend can ask the user to remove the
      // existing member instead of reporting that only some emails were saved.
      req.log.warn(
        {
          logType: "feature",
          event: "workspace.invitation_rejected",
          reason: error.name,
          ...logContext,
        },
        "[FEATURE] Workspace invitation rejected",
      );
      return res.status(409).json({ success: false, error: error.message });
    }

    if (error instanceof WorkspaceInvitationAlreadyExistsError) {
      // A previous invitation for any email also rejects the complete request.
      // HTTP 409 tells the frontend that the request conflicts with saved data.
      req.log.warn(
        {
          logType: "feature",
          event: "workspace.invitation_rejected",
          reason: error.name,
          ...logContext,
        },
        "[FEATURE] Workspace invitation rejected",
      );
      return res.status(409).json({ success: false, error: error.message });
    }

    req.log.error(
      {
        logType: "feature",
        event: "workspace.invitation_failed",
        err: error,
        ...logContext,
      },
      "[FEATURE] Unable to create workspace invitations",
    );
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

export const removeWorkspaceMember = async (
  req: AuthenticatedRequest<unknown, RemoveWorkspaceMemberParams>,
  res: Response,
) => {
  const workspaceId = Number(req.params.workspaceId);
  const memberUserId = Number(req.params.memberId);
  const actorRole = req.workspaceMembership?.role;
  const logContext = {
    workspaceId,
    actorUserId: req.user.id,
    targetUserId: memberUserId,
  };

  if (!actorRole) {
    // Routes using this controller must first verify workspace membership. Keep
    // a defensive response here so a future routing mistake cannot bypass that
    // authorization boundary or expose member-management behavior.
    req.log.warn(
      {
        logType: "feature",
        event: "workspace.member_removal_rejected",
        reason: "MEMBERSHIP_CONTEXT_MISSING",
        ...logContext,
      },
      "[FEATURE] Workspace member removal rejected",
    );
    return res.status(403).json({
      success: false,
      error: "You do not have access to this workspace",
    });
  }

  try {
    const result = await removeWorkspaceMemberService(
      workspaceId,
      memberUserId,
      actorRole,
    );

    // Log only stable database identifiers and the previous role. Email and
    // profile fields are unnecessary for diagnosis and would add personal data.
    req.log.info(
      {
        logType: "feature",
        event: "workspace.member_removed",
        previousRole: result.previousRole,
        ...logContext,
      },
      "[FEATURE] Workspace member removed",
    );

    return res.status(200).json(
      createSuccessResponse("Workspace member removed", {
        memberId: result.memberId,
      }),
    );
  } catch (error) {
    if (
      error instanceof WorkspaceMemberRemovalForbiddenError ||
      error instanceof WorkspaceMemberNotFoundError ||
      error instanceof WorkspaceOwnerRemovalError
    ) {
      const status = error instanceof WorkspaceMemberNotFoundError ? 404 :
        error instanceof WorkspaceOwnerRemovalError ? 409 : 403;

      req.log.warn(
        {
          logType: "feature",
          event: "workspace.member_removal_rejected",
          reason: error.name,
          ...logContext,
        },
        "[FEATURE] Workspace member removal rejected",
      );
      return res.status(status).json({
        success: false,
        error: error.message,
      });
    }

    // Include the Error object only for unexpected failures so Pino preserves
    // its stack trace. The global redaction rules still remove known secrets.
    req.log.error(
      {
        logType: "feature",
        event: "workspace.member_removal_failed",
        err: error,
        ...logContext,
      },
      "[FEATURE] Unable to remove workspace member",
    );
    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};

export const updateWorkspaceMemberRole = async (
  req: AuthenticatedRequest<
    UpdateWorkspaceMemberRoleBody,
    UpdateWorkspaceMemberRoleParams
  >,
  res: Response,
) => {
  const workspaceId = Number(req.params.workspaceId);
  const memberUserId = Number(req.params.memberId);
  const actorRole = req.workspaceMembership?.role;
  const logContext = {
    workspaceId,
    actorUserId: req.user.id,
    targetUserId: memberUserId,
  };

  if (!actorRole) {
    req.log.warn(
      {
        logType: "feature",
        event: "workspace.member_role_update_rejected",
        reason: "MEMBERSHIP_CONTEXT_MISSING",
        ...logContext,
      },
      "[FEATURE] Workspace member role update rejected",
    );
    return res.status(403).json({
      success: false,
      error: "You do not have access to this workspace",
    });
  }

  try {
    const result = await updateWorkspaceMemberRoleService(
      workspaceId,
      memberUserId,
      req.user.id,
      actorRole,
      req.body.role,
    );

    req.log.info(
      {
        logType: "feature",
        event: "workspace.member_role_updated",
        previousRole: result.previousRole,
        nextRole: result.member.role,
        ...logContext,
      },
      "[FEATURE] Workspace member role updated",
    );

    return res.status(200).json(
      createSuccessResponse("Workspace member role updated", result.member),
    );
  } catch (error) {
    if (
      error instanceof WorkspaceMemberRoleUpdateForbiddenError ||
      error instanceof WorkspaceMemberSelfRoleUpdateError ||
      error instanceof WorkspaceMemberNotFoundError ||
      error instanceof WorkspaceOwnerRoleUpdateError
    ) {
      const status = error instanceof WorkspaceMemberNotFoundError ? 404 :
        error instanceof WorkspaceOwnerRoleUpdateError ? 409 : 403;

      req.log.warn(
        {
          logType: "feature",
          event: "workspace.member_role_update_rejected",
          reason: error.name,
          ...logContext,
        },
        "[FEATURE] Workspace member role update rejected",
      );
      return res.status(status).json({
        success: false,
        error: error.message,
      });
    }

    req.log.error(
      {
        logType: "feature",
        event: "workspace.member_role_update_failed",
        err: error,
        ...logContext,
      },
      "[FEATURE] Unable to update workspace member role",
    );
    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};
