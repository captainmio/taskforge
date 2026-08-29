import { Router } from "express";
import {
  createTask,
  getProjectTasks,
  updateTask,
} from "../controllers/task.controller.js";
import { authenticatedHandler } from "../middlewares/authenticatedHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireWorkspaceMembership } from "../middlewares/requireWorkspaceMembership.js";
import { validate } from "../middlewares/validate.js";
import {
  createTaskSchema,
  projectTasksSchema,
  updateTaskSchema,
} from "../validations/task.validation.js";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requireAuth,
  validate(projectTasksSchema),
  requireWorkspaceMembership,
  authenticatedHandler(getProjectTasks),
);

router.post(
  "/",
  requireAuth,
  validate(createTaskSchema),
  requireWorkspaceMembership,
  authenticatedHandler(createTask),
);

router.patch(
  "/:taskId",
  requireAuth,
  validate(updateTaskSchema),
  requireWorkspaceMembership,
  authenticatedHandler(updateTask),
);

export default router;
