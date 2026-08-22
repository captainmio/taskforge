import { ProjectCreationForbiddenError } from "../errors/project.errors.js";
import {
  ProjectStatus,
  WorkspaceRole,
} from "../generated/prisma/enums.js";
import { createProjectRecord } from "../repositories/project.repository.js";
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

  return createProjectRecord({
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
};
