import {
  deleteCachedProjectList,
  getCachedProjectList,
  setCachedProjectList,
  type ProjectListItem,
} from "../cache/project-list.cache.js";
import { deleteCachedWorkspaceOverview } from "../cache/workspace-overview.cache.js";
import {
  ProjectCreationForbiddenError,
  ProjectDeletionForbiddenError,
  ProjectNotFoundError,
} from "../errors/project.errors.js";
import {
  ProjectStatus,
  WorkspaceRole,
} from "../generated/prisma/enums.js";
import {
  createProjectRecord,
  deleteProjectRecord,
  findProjectsByWorkspace,
} from "../repositories/project.repository.js";
import type { CreateProjectBody } from "../validations/project.validation.js";

const projectStatusByInput = {
  planning: ProjectStatus.planning,
  active: ProjectStatus.active,
  "on-hold": ProjectStatus.on_hold,
  completed: ProjectStatus.completed,
} as const;

const toProjectDate = (value: string): Date | null =>
  value ? new Date(`${value}T00:00:00.000Z`) : null;

export const createProject = async (
  workspaceId: number,
  createdById: number,
  actorRole: WorkspaceRole,
  input: CreateProjectBody,
) => {
  if (actorRole !== WorkspaceRole.OWNER && actorRole !== WorkspaceRole.ADMIN) {
    throw new ProjectCreationForbiddenError();
  }

  const project = await createProjectRecord({
    workspaceId,
    createdById,
    name: input.projectName,
    description: input.description,
    icon: input.icon,
    status: projectStatusByInput[input.status],
    startDate: toProjectDate(input.startDate),
    dueDate: toProjectDate(input.dueDate),
    defaultView: input.defaultView,
  });

  // The overview now contains projects. Clear its cache only after PostgreSQL
  // has committed the new record so the next read contains the new project.
  await Promise.all([
    deleteCachedWorkspaceOverview(workspaceId),
    deleteCachedProjectList(workspaceId),
  ]);

  return project;
};

export const getProjects = async (
  workspaceId: number,
): Promise<ProjectListItem[]> => {
  const cachedProjects = await getCachedProjectList(workspaceId);
  if (cachedProjects) return cachedProjects;

  const projects = await findProjectsByWorkspace(workspaceId);
  const result: ProjectListItem[] = projects.map((project) => ({
    ...project,
    startDate: project.startDate?.toISOString() ?? null,
    dueDate: project.dueDate?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
  }));

  await setCachedProjectList(workspaceId, result);
  return result;
};

export const deleteProject = async (
  workspaceId: number,
  projectId: number,
  actorRole: WorkspaceRole,
) => {
  if (actorRole !== WorkspaceRole.OWNER && actorRole !== WorkspaceRole.ADMIN) {
    throw new ProjectDeletionForbiddenError();
  }

  // Scope the database write to the current workspace so a valid project ID
  // cannot delete a project that belongs to a different workspace.
  const deletion = await deleteProjectRecord(workspaceId, projectId);
  if (deletion.count === 0) {
    throw new ProjectNotFoundError();
  }

  await Promise.all([
    deleteCachedWorkspaceOverview(workspaceId),
    deleteCachedProjectList(workspaceId),
  ]);

  return { id: projectId };
};
