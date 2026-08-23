import { Router } from "express";
import {
  createProject,
  getProjects,
} from "../controllers/project.controller.js";
import { authenticatedHandler } from "../middlewares/authenticatedHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireWorkspaceMembership } from "../middlewares/requireWorkspaceMembership.js";
import { validate } from "../middlewares/validate.js";
import {
  createProjectSchema,
  projectListSchema,
} from "../validations/project.validation.js";

// The parent router supplies :workspaceId. Merge it so validation,
// membership lookup, and the controller all receive the same route parameter.
const router = Router({ mergeParams: true });

router.get(
  "/",
  requireAuth,
  validate(projectListSchema),
  requireWorkspaceMembership,
  authenticatedHandler(getProjects),
);

router.post(
  "/",
  requireAuth,
  validate(createProjectSchema),
  requireWorkspaceMembership,
  authenticatedHandler(createProject),
);

export default router;
