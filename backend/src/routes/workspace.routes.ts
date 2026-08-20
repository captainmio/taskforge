import Router from "express";
import {
  acceptWorkspaceInvitation,
  createWorkspace,
  getWorkspaceOverview,
  getWorkspaceMembers,
  inviteWorkspaceMembers,
  removeWorkspaceMember,
} from "../controllers/workspace.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { authenticatedHandler } from "../middlewares/authenticatedHandler.js";
import { requireWorkspaceMembership } from "../middlewares/requireWorkspaceMembership.js";
import { validate } from "../middlewares/validate.js";
import {
  acceptWorkspaceInvitationSchema,
  createWorkspaceSchema,
  inviteWorkspaceMembersSchema,
  workspaceOverviewSchema,
  workspaceMembersSchema,
  removeWorkspaceMemberSchema,
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
router.post(
  "/:workspaceId/invitations",
  requireAuth,
  validate(inviteWorkspaceMembersSchema),
  requireWorkspaceMembership,
  authenticatedHandler(inviteWorkspaceMembers),
);

router.post(
  "/invitations/accept",
  requireAuth,
  validate(acceptWorkspaceInvitationSchema),
  authenticatedHandler(acceptWorkspaceInvitation),
);

export default router;
