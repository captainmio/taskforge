import Router from "express";
import {
  acceptWorkspaceInvitation,
  createWorkspace,
} from "../controllers/workspace.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { authenticatedHandler } from "../middlewares/authenticatedHandler.js";
import { validate } from "../middlewares/validate.js";
import {
  acceptWorkspaceInvitationSchema,
  createWorkspaceSchema,
} from "../validations/workspace.validation.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  validate(createWorkspaceSchema),
  authenticatedHandler(createWorkspace),
);

router.post(
  "/invitations/accept",
  requireAuth,
  validate(acceptWorkspaceInvitationSchema),
  authenticatedHandler(acceptWorkspaceInvitation),
);

export default router;
