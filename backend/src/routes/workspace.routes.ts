import Router from "express";
import { createWorkspace } from "../controllers/workspace.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validate } from "../middlewares/validate.js";
import { createWorkspaceSchema } from "../validations/workspace.validation.js";

const router = Router();

router.post("/", requireAuth, validate(createWorkspaceSchema), createWorkspace);

export default router;
