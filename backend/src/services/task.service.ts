import { ProjectNotFoundError } from "../errors/project.errors.js";
import { TaskAssigneeNotInWorkspaceError } from "../errors/task.errors.js";
import { TaskPriority, TaskStatus } from "../generated/prisma/enums.js";
import { findProjectByWorkspace } from "../repositories/project.repository.js";
import {
  createTaskRecord,
  findTasksByProject,
} from "../repositories/task.repository.js";
import { countWorkspaceMembersByUserIds } from "../repositories/workspace.repository.js";
import type { CreateTaskBody } from "../validations/task.validation.js";

const taskStatusByInput = {
  todo: TaskStatus.todo,
  in_progress: TaskStatus.in_progress,
  in_review: TaskStatus.in_review,
  done: TaskStatus.done,
} as const;

const taskPriorityByInput = {
  low: TaskPriority.low,
  medium: TaskPriority.medium,
  high: TaskPriority.high,
} as const;

export const createTask = async (
  workspaceId: number,
  projectId: number,
  createdById: number,
  input: CreateTaskBody,
) => {
  const project = await findProjectByWorkspace(workspaceId, projectId);
  if (!project) throw new ProjectNotFoundError();

  const assigneeIds = [...new Set(input.assigneeIds)];
  const assignedMemberCount = await countWorkspaceMembersByUserIds(
    workspaceId,
    assigneeIds,
  );
  if (assignedMemberCount !== assigneeIds.length) {
    throw new TaskAssigneeNotInWorkspaceError();
  }

  return createTaskRecord({
    projectId,
    createdById,
    title: input.title,
    description: input.description,
    status: taskStatusByInput[input.status],
    priority: taskPriorityByInput[input.priority],
    dueDate: input.dueDate,
    timeEstimate: input.timeEstimate,
    assigneeIds,
  });
};

export const getProjectTasks = async (
  workspaceId: number,
  projectId: number,
  page: number,
  pageSize: number,
) => {
  const project = await findProjectByWorkspace(workspaceId, projectId);
  if (!project) throw new ProjectNotFoundError();

  const { tasks, total } = await findTasksByProject(
    projectId,
    (page - 1) * pageSize,
    pageSize,
  );

  return {
    tasks: tasks.map(({ assignees, createdAt, updatedAt, ...task }) => ({
      ...task,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      assignees: assignees.map(({ user }) => user),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};
