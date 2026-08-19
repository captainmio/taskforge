import Router from "express";
import {
  acceptWorkspaceInvitation,
  createWorkspace,
  getWorkspaceOverview,
} from "../controllers/workspace.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { authenticatedHandler } from "../middlewares/authenticatedHandler.js";
import { requireWorkspaceMembership } from "../middlewares/requireWorkspaceMembership.js";
import { validate } from "../middlewares/validate.js";
import {
  acceptWorkspaceInvitationSchema,
  createWorkspaceSchema,
  workspaceOverviewSchema,
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

router.post(
  "/invitations/accept",
  requireAuth,
  validate(acceptWorkspaceInvitationSchema),
  authenticatedHandler(acceptWorkspaceInvitation),
);

export default router;
