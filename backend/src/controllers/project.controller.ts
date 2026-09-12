import type { Response } from "express";
import {
  ProjectCreationForbiddenError,
  ProjectDeletionForbiddenError,
  ProjectNotFoundError,
  ProjectUpdateForbiddenError,
  ProjectRestoreForbiddenError,
} from "../errors/project.errors.js";
import {
  createProject as createProjectService,
  deleteProject as deleteProjectService,
  getProjectById as getProjectByIdService,
  getProjects as getProjectsService,
  getArchivedProjects as getArchivedProjectsService,
  restoreProject as restoreProjectService,
  updateProject as updateProjectService,
} from "../services/project.service.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";
import type {
  CreateProjectBody,
  CreateProjectParams,
  DeleteProjectParams,
  ProjectListParams,
  ProjectDetailParams,
  UpdateProjectBody,
  UpdateProjectParams,
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
  const currentUserRole = req.workspaceMembership?.role;
  if (!currentUserRole) {
    return res.status(403).json({
      success: false,
      error: "You do not have access to this workspace",
    });
  }

  try {
    const projects = await getProjectsService(Number(req.params.workspaceId));

    return res
      .status(200)
      .json(createSuccessResponse("Projects retrieved", {
        // Project lists are shared safely through Redis. Add the requester role
        // after the cache lookup so permission data is never reused across users.
        projects,
        currentUserRole,
      }));
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

export const getArchivedProjects = async (
  req: AuthenticatedRequest<unknown, ProjectListParams>,
  res: Response,
) => {
  const role = req.workspaceMembership?.role;
  if (role !== "OWNER" && role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      error: "You do not have access to archived projects",
    });
  }

  const projects = await getArchivedProjectsService(
    Number(req.params.workspaceId),
  );
  return res.status(200).json(
    createSuccessResponse("Archived projects retrieved", {
      projects,
      currentUserRole: role,
    }),
  );
};

export const restoreProject = async (
  req: AuthenticatedRequest<unknown, DeleteProjectParams>,
  res: Response,
) => {
  const role = req.workspaceMembership?.role;
  if (!role) {
    return res.status(403).json({
      success: false,
      error: "You do not have access to this workspace",
    });
  }

  try {
    const project = await restoreProjectService(
      Number(req.params.workspaceId),
      Number(req.params.projectId),
      role,
      req.user.id,
    );
    return res.status(200).json(createSuccessResponse("Project restored", project));
  } catch (error) {
    if (
      error instanceof ProjectRestoreForbiddenError ||
      error instanceof ProjectNotFoundError
    ) {
      return res
        .status(error instanceof ProjectRestoreForbiddenError ? 403 : 404)
        .json({ success: false, error: error.message });
    }

    throw error;
  }
};

export const getProjectById = async (
  req: AuthenticatedRequest<unknown, ProjectDetailParams>,
  res: Response,
) => {
  const workspaceId = Number(req.params.workspaceId);
  const projectId = Number(req.params.projectId);
  const currentUserRole = req.workspaceMembership?.role;

  if (!currentUserRole) {
    return res.status(403).json({
      success: false,
      error: "You do not have access to this workspace",
    });
  }

  try {
    const project = await getProjectByIdService(workspaceId, projectId);
    return res.status(200).json(createSuccessResponse("Project retrieved", {
      project,
      currentUserRole,
    }));
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return res.status(404).json({ success: false, error: error.message });
    }

    req.log.error(
      {
        logType: "feature",
        event: "project.retrieve_failed",
        err: error,
        workspaceId,
        projectId,
        actorUserId: req.user.id,
      },
      "[FEATURE] Unable to retrieve project",
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
    const project = await deleteProjectService(
      workspaceId,
      projectId,
      actorRole,
      req.user.id,
    );

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

export const updateProject = async (
  req: AuthenticatedRequest<UpdateProjectBody, UpdateProjectParams>,
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
    const project = await updateProjectService(
      workspaceId,
      projectId,
      actorRole,
      req.body,
    );
    req.log.info(
      { logType: "feature", event: "project.updated", ...logContext },
      "[FEATURE] Project updated",
    );
    return res.status(200).json(createSuccessResponse("Project updated", project));
  } catch (error) {
    if (
      error instanceof ProjectUpdateForbiddenError ||
      error instanceof ProjectNotFoundError
    ) {
      const status = error instanceof ProjectNotFoundError ? 404 : 403;
      req.log.warn(
        {
          logType: "feature",
          event: "project.update_rejected",
          reason: error.name,
          ...logContext,
        },
        "[FEATURE] Project update rejected",
      );
      return res.status(status).json({ success: false, error: error.message });
    }

    req.log.error(
      {
        logType: "feature",
        event: "project.update_failed",
        err: error,
        ...logContext,
      },
      "[FEATURE] Unable to update project",
    );
    return res.status(500).json({
      success: false,
      error: "Something went wrong on our end",
    });
  }
};
