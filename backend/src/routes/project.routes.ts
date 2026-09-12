import { Router } from "express";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  getArchivedProjects,
  restoreProject,
  updateProject,
} from "../controllers/project.controller.js";
import { authenticatedHandler } from "../middlewares/authenticatedHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { requireActiveProject } from "../middlewares/requireActiveProject.js";
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
  "/archived",
  requireAuth,
  validate(projectListSchema),
  requireWorkspaceMembership,
  authenticatedHandler(getArchivedProjects),
);

router.get(
  "/:projectId",
  requireAuth,
  validate(projectDetailSchema),
  requireWorkspaceMembership,
  requireProjectAccess,
  authenticatedHandler(getProjectById),
);

router.delete(
  "/:projectId",
  requireAuth,
  validate(deleteProjectSchema),
  requireWorkspaceMembership,
  requireProjectAccess,
  requireActiveProject,
  authenticatedHandler(deleteProject),
);

router.patch(
  "/:projectId",
  requireAuth,
  validate(updateProjectSchema),
  requireWorkspaceMembership,
  requireProjectAccess,
  requireActiveProject,
  authenticatedHandler(updateProject),
);
router.patch(
  "/:projectId/restore",
  requireAuth,
  validate(deleteProjectSchema),
  requireWorkspaceMembership,
  requireProjectAccess,
  authenticatedHandler(restoreProject),
);

export default router;
