import type { Response } from "express";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from "../config/pagination.js";
import { ProjectNotFoundError } from "../errors/project.errors.js";
import {
  TaskAssigneeNotInWorkspaceError,
  TaskCompletionForbiddenError,
  TaskNotFoundError,
} from "../errors/task.errors.js";
import {
  createTask as createTaskService,
  getProjectTasks as getProjectTasksService,
  updateTask as updateTaskService,
} from "../services/task.service.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";
import { createSuccessResponse } from "../utils/api-response.js";
import {
  emitTaskCreated,
  emitTaskUpdated,
} from "../realtime/task.socket.js";
import type {
  CreateTaskBody,
  CreateTaskParams,
  ProjectTasksParams,
  ProjectTasksQuery,
  UpdateTaskBody,
  UpdateTaskParams,
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
      req.workspaceMembership.role,
      req.body,
    );
    req.log.info(
      { logType: "feature", event: "task.created", taskId: task.id, ...logContext },
      "[FEATURE] Task created",
    );
    emitTaskCreated({ workspaceId, projectId, taskId: task.id });
    return res.status(201).json(createSuccessResponse("Task created", task));
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error instanceof TaskAssigneeNotInWorkspaceError) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error instanceof TaskCompletionForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
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

export const getProjectTasks = async (
  req: AuthenticatedRequest<unknown, ProjectTasksParams, ProjectTasksQuery>,
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

  // Validation accepts only positive-integer query values. Shared defaults keep
  // this endpoint consistent with the workspace-members list.
  const page = req.query.page ? Number(req.query.page) : DEFAULT_PAGE;
  const pageSize = req.query.pageSize
    ? Number(req.query.pageSize)
    : DEFAULT_PAGE_SIZE;

  try {
    const result = await getProjectTasksService(
      workspaceId,
      projectId,
      page,
      pageSize,
    );
    return res
      .status(200)
      .json(createSuccessResponse("Project tasks retrieved", result));
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return res.status(404).json({ success: false, error: error.message });
    }

    req.log.error(
      { logType: "feature", event: "task.list_failed", err: error, ...logContext },
      "[FEATURE] Unable to retrieve project tasks",
    );
    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};

export const updateTask = async (
  req: AuthenticatedRequest<UpdateTaskBody, UpdateTaskParams>,
  res: Response,
) => {
  const workspaceId = Number(req.params.workspaceId);
  const projectId = Number(req.params.projectId);
  const taskId = Number(req.params.taskId);
  const logContext = { workspaceId, projectId, taskId, actorUserId: req.user.id };

  if (!req.workspaceMembership) {
    return res.status(403).json({
      success: false,
      error: "You do not have access to this workspace",
    });
  }

  try {
    const task = await updateTaskService(
      workspaceId,
      projectId,
      taskId,
      req.workspaceMembership.role,
      req.body,
    );
    req.log.info(
      { logType: "feature", event: "task.updated", ...logContext },
      "[FEATURE] Task updated",
    );
    emitTaskUpdated({ workspaceId, projectId, task });
    return res.status(200).json(createSuccessResponse("Task updated", task));
  } catch (error) {
    if (error instanceof ProjectNotFoundError || error instanceof TaskNotFoundError) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error instanceof TaskAssigneeNotInWorkspaceError) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error instanceof TaskCompletionForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }

    req.log.error(
      { logType: "feature", event: "task.update_failed", err: error, ...logContext },
      "[FEATURE] Unable to update task",
    );
    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};
