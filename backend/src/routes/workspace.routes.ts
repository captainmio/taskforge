import Router from "express";
import {
  acceptWorkspaceInviteLink,
  acceptWorkspaceInvitation,
  createWorkspaceInviteLink,
  createWorkspace,
  getWorkspaceOverview,
  getWorkspaceTaskHistory,
  getWorkspaceMembers,
  inviteWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "../controllers/workspace.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { authenticatedHandler } from "../middlewares/authenticatedHandler.js";
import { requireWorkspaceMembership } from "../middlewares/requireWorkspaceMembership.js";
import { validate } from "../middlewares/validate.js";
import {
  acceptWorkspaceInviteLinkSchema,
  acceptWorkspaceInvitationSchema,
  createWorkspaceInviteLinkSchema,
  createWorkspaceSchema,
  inviteWorkspaceMembersSchema,
  workspaceOverviewSchema,
  workspaceHistorySchema,
  workspaceMembersSchema,
  removeWorkspaceMemberSchema,
  updateWorkspaceMemberRoleSchema,
} from "../validations/workspace.validation.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  validate(createWorkspaceSchema),
  authenticatedHandler(createWorkspace),
);
router.get(
  "/:workspaceId/overview",
  requireAuth,
  validate(workspaceOverviewSchema),
  requireWorkspaceMembership,
  authenticatedHandler(getWorkspaceOverview),
);
router.get(
  "/:workspaceId/history",
  requireAuth,
  validate(workspaceHistorySchema),
  requireWorkspaceMembership,
  authenticatedHandler(getWorkspaceTaskHistory),
);
router.get(
  "/:workspaceId/members",
  requireAuth,
  validate(workspaceMembersSchema),
  requireWorkspaceMembership,
  authenticatedHandler(getWorkspaceMembers),
);
router.delete(
  "/:workspaceId/members/:memberId",
  requireAuth,
  validate(removeWorkspaceMemberSchema),
  requireWorkspaceMembership,
  authenticatedHandler(removeWorkspaceMember),
);
router.patch(
  "/:workspaceId/members/:memberId",
  requireAuth,
  validate(updateWorkspaceMemberRoleSchema),
  requireWorkspaceMembership,
  authenticatedHandler(updateWorkspaceMemberRole),
);
router.post(
  "/:workspaceId/invitation-link",
  requireAuth,
  validate(createWorkspaceInviteLinkSchema),
  requireWorkspaceMembership,
  authenticatedHandler(createWorkspaceInviteLink),
);
router.post(
  "/:workspaceId/invitations",
  requireAuth,
  validate(inviteWorkspaceMembersSchema),
  requireWorkspaceMembership,
  authenticatedHandler(inviteWorkspaceMembers),
);

router.post(
  "/invitation-links/accept",
  requireAuth,
  validate(acceptWorkspaceInviteLinkSchema),
  authenticatedHandler(acceptWorkspaceInviteLink),
);

router.post(
  "/invitations/accept",
  requireAuth,
  validate(acceptWorkspaceInvitationSchema),
  authenticatedHandler(acceptWorkspaceInvitation),
);

export default router;
