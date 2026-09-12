import { Router } from "express";
import {
  createTask,
  createTaskComment,
  getTaskComments,
  getTaskHistory,
  getProjectTasks,
  updateTask,
} from "../controllers/task.controller.js";
import { authenticatedHandler } from "../middlewares/authenticatedHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { requireActiveProject } from "../middlewares/requireActiveProject.js";
import { requireWorkspaceMembership } from "../middlewares/requireWorkspaceMembership.js";
import { validate } from "../middlewares/validate.js";
import {
  createTaskSchema,
  createTaskCommentSchema,
  taskCommentsSchema,
  projectTasksSchema,
  taskHistorySchema,
  updateTaskSchema,
} from "../validations/task.validation.js";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requireAuth,
  validate(projectTasksSchema),
  requireWorkspaceMembership,
  requireProjectAccess,
  authenticatedHandler(getProjectTasks),
);

router.post(
  "/",
  requireAuth,
  validate(createTaskSchema),
  requireWorkspaceMembership,
  requireProjectAccess,
  requireActiveProject,
  authenticatedHandler(createTask),
);

router.get(
  "/:taskId/history",
  requireAuth,
  validate(taskHistorySchema),
  requireWorkspaceMembership,
  requireProjectAccess,
  authenticatedHandler(getTaskHistory),
);

router.patch(
  "/:taskId",
  requireAuth,
  validate(updateTaskSchema),
  requireWorkspaceMembership,
  requireProjectAccess,
  requireActiveProject,
  authenticatedHandler(updateTask),
);

router.get(
  "/:taskId/comments",
  requireAuth,
  validate(taskCommentsSchema),
  requireWorkspaceMembership,
  requireProjectAccess,
  authenticatedHandler(getTaskComments),
);

router.post(
  "/:taskId/comments",
  requireAuth,
  validate(createTaskCommentSchema),
  requireWorkspaceMembership,
  requireProjectAccess,
  requireActiveProject,
  authenticatedHandler(createTaskComment),
);

export default router;
