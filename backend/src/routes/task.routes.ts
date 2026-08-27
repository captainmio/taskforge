import { Router } from "express";
import { createTask } from "../controllers/task.controller.js";
import { authenticatedHandler } from "../middlewares/authenticatedHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireWorkspaceMembership } from "../middlewares/requireWorkspaceMembership.js";
import { validate } from "../middlewares/validate.js";
import { createTaskSchema } from "../validations/task.validation.js";

const router = Router({ mergeParams: true });

router.post(
  "/",
  requireAuth,
  validate(createTaskSchema),
  requireWorkspaceMembership,
  authenticatedHandler(createTask),
);

export default router;
