import type { Response } from "express";
import {
  ProjectCreationForbiddenError,
  ProjectDeletionForbiddenError,
  ProjectNotFoundError,
} from "../errors/project.errors.js";
import {
  createProject as createProjectService,
  deleteProject as deleteProjectService,
  getProjects as getProjectsService,
} from "../services/project.service.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";
import type {
  CreateProjectBody,
  CreateProjectParams,
  DeleteProjectParams,
  ProjectListParams,
} from "../validations/project.validation.js";
import { createSuccessResponse } from "../utils/api-response.js";

export const createProject = async (
  req: AuthenticatedRequest<CreateProjectBody, CreateProjectParams>,
  res: Response,
) => {
  const workspaceId = Number(req.params.workspaceId);
  const actorRole = req.workspaceMembership?.role;
  const logContext = { workspaceId, actorUserId: req.user.id };

  if (!actorRole) {
    return res.status(403).json({
      success: false,
      error: "You do not have access to this workspace",
    });
  }

  try {
    const project = await createProjectService(
      workspaceId,
      req.user.id,
      actorRole,
      req.body,
    );

    req.log.info(
      {
        logType: "feature",
        event: "project.created",
        projectId: project.id,
        ...logContext,
      },
      "[FEATURE] Project created",
    );

    return res.status(201).json(createSuccessResponse("Project created", project));
  } catch (error) {
    if (error instanceof ProjectCreationForbiddenError) {
      req.log.warn(
        {
          logType: "feature",
          event: "project.creation_rejected",
          reason: error.name,
          ...logContext,
        },
        "[FEATURE] Project creation rejected",
      );
      return res.status(403).json({ success: false, error: error.message });
    }

    req.log.error(
      {
        logType: "feature",
        event: "project.creation_failed",
        err: error,
        ...logContext,
      },
      "[FEATURE] Unable to create project",
    );
    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};

export const getProjects = async (
  req: AuthenticatedRequest<unknown, ProjectListParams>,
  res: Response,
) => {
  try {
    const projects = await getProjectsService(Number(req.params.workspaceId));

    return res
      .status(200)
      .json(createSuccessResponse("Projects retrieved", projects));
  } catch (error) {
    req.log.error(
      {
        logType: "feature",
        event: "project.list_failed",
        err: error,
        workspaceId: Number(req.params.workspaceId),
        actorUserId: req.user.id,
      },
      "[FEATURE] Unable to retrieve projects",
    );
    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};

export const deleteProject = async (
  req: AuthenticatedRequest<unknown, DeleteProjectParams>,
  res: Response,
) => {
  const workspaceId = Number(req.params.workspaceId);
  const projectId = Number(req.params.projectId);
  const actorRole = req.workspaceMembership?.role;
  const logContext = { workspaceId, projectId, actorUserId: req.user.id };

  if (!actorRole) {
    return res.status(403).json({
      success: false,
      error: "You do not have access to this workspace",
    });
  }

  try {
    const project = await deleteProjectService(workspaceId, projectId, actorRole);

    req.log.info(
      { logType: "feature", event: "project.deleted", ...logContext },
      "[FEATURE] Project deleted",
    );
    return res.status(200).json(createSuccessResponse("Project deleted", project));
  } catch (error) {
    if (
      error instanceof ProjectDeletionForbiddenError ||
      error instanceof ProjectNotFoundError
    ) {
      const status = error instanceof ProjectNotFoundError ? 404 : 403;
      req.log.warn(
        {
          logType: "feature",
          event: "project.deletion_rejected",
          reason: error.name,
          ...logContext,
        },
        "[FEATURE] Project deletion rejected",
      );
      return res.status(status).json({ success: false, error: error.message });
    }

    req.log.error(
      {
        logType: "feature",
        event: "project.deletion_failed",
        err: error,
        ...logContext,
      },
      "[FEATURE] Unable to delete project",
    );
    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};
