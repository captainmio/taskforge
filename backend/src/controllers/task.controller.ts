import type { Response } from "express";
import { ProjectNotFoundError } from "../errors/project.errors.js";
import { TaskAssigneeNotInWorkspaceError } from "../errors/task.errors.js";
import { createTask as createTaskService } from "../services/task.service.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";
import { createSuccessResponse } from "../utils/api-response.js";
import type {
  CreateTaskBody,
  CreateTaskParams,
} from "../validations/task.validation.js";

export const createTask = async (
  req: AuthenticatedRequest<CreateTaskBody, CreateTaskParams>,
  res: Response,
) => {
  const workspaceId = Number(req.params.workspaceId);
  const projectId = Number(req.params.projectId);
  const logContext = { workspaceId, projectId, actorUserId: req.user.id };

  if (!req.workspaceMembership) {
    return res.status(403).json({
      success: false,
      error: "You do not have access to this workspace",
    });
  }

  try {
    const task = await createTaskService(
      workspaceId,
      projectId,
      req.user.id,
      req.body,
    );
    req.log.info(
      { logType: "feature", event: "task.created", taskId: task.id, ...logContext },
      "[FEATURE] Task created",
    );
    return res.status(201).json(createSuccessResponse("Task created", task));
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error instanceof TaskAssigneeNotInWorkspaceError) {
      return res.status(400).json({ success: false, error: error.message });
    }

    req.log.error(
      { logType: "feature", event: "task.creation_failed", err: error, ...logContext },
      "[FEATURE] Unable to create task",
    );
    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};
