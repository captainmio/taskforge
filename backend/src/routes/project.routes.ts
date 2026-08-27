import { Router } from "express";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  updateProject,
} from "../controllers/project.controller.js";
import { authenticatedHandler } from "../middlewares/authenticatedHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireWorkspaceMembership } from "../middlewares/requireWorkspaceMembership.js";
import { validate } from "../middlewares/validate.js";
import {
  createProjectSchema,
  deleteProjectSchema,
  projectDetailSchema,
  projectListSchema,
  updateProjectSchema,
} from "../validations/project.validation.js";
import task from "./task.routes.js";

// The parent router supplies :workspaceId. Merge it so validation,
// membership lookup, and the controller all receive the same route parameter.
const router = Router({ mergeParams: true });

router.use("/:projectId/tasks", task);

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

router.get(
  "/:projectId",
  requireAuth,
  validate(projectDetailSchema),
  requireWorkspaceMembership,
  authenticatedHandler(getProjectById),
);

router.delete(
  "/:projectId",
  requireAuth,
  validate(deleteProjectSchema),
  requireWorkspaceMembership,
  authenticatedHandler(deleteProject),
);

router.patch(
  "/:projectId",
  requireAuth,
  validate(updateProjectSchema),
  requireWorkspaceMembership,
  authenticatedHandler(updateProject),
);

export default router;
