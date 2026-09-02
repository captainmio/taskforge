import { ProjectNotFoundError } from "../errors/project.errors.js";
import { deleteCachedWorkspaceOverview } from "../cache/workspace-overview.cache.js";
import {
  TaskAssigneeNotInWorkspaceError,
  TaskCompletionForbiddenError,
  TaskNotFoundError,
} from "../errors/task.errors.js";
import { Prisma } from "../generated/prisma/client.js";
import { TaskPriority, TaskStatus, WorkspaceRole } from "../generated/prisma/enums.js";
import { findProjectByWorkspace } from "../repositories/project.repository.js";
import {
  createTaskRecord,
  findTaskHistoryByTask,
  findTasksByProject,
  updateTaskRecord,
} from "../repositories/task.repository.js";
import { countWorkspaceMembersByUserIds } from "../repositories/workspace.repository.js";
import type {
  CreateTaskBody,
  UpdateTaskBody,
} from "../validations/task.validation.js";

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
  actorRole: WorkspaceRole,
  input: CreateTaskBody,
) => {
  if (
    input.status === "done" &&
    actorRole !== WorkspaceRole.OWNER &&
    actorRole !== WorkspaceRole.ADMIN
  ) {
    throw new TaskCompletionForbiddenError();
  }
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

  const task = await createTaskRecord({
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
  await deleteCachedWorkspaceOverview(workspaceId);

  return task;
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

export const getTaskHistory = async (
  workspaceId: number,
  projectId: number,
  taskId: number,
  cursor: number | undefined,
  limit: number,
) => {
  const project = await findProjectByWorkspace(workspaceId, projectId);
  if (!project) throw new ProjectNotFoundError();

  const result = await findTaskHistoryByTask(projectId, taskId, cursor, limit);
  if (!result) throw new TaskNotFoundError();

  return {
    history: result.history.map(({ createdAt, ...entry }) => ({
      ...entry,
      createdAt: createdAt.toISOString(),
    })),
    nextCursor: result.nextCursor,
  };
};

export const updateTask = async (
  workspaceId: number,
  projectId: number,
  taskId: number,
  actorRole: WorkspaceRole,
  input: UpdateTaskBody,
  actorUserId?: number,
) => {
  if (
    input.status === "done" &&
    actorRole !== WorkspaceRole.OWNER &&
    actorRole !== WorkspaceRole.ADMIN
  ) {
    throw new TaskCompletionForbiddenError();
  }

  const project = await findProjectByWorkspace(workspaceId, projectId);
  if (!project) throw new ProjectNotFoundError();

  const assigneeIds = input.assigneeIds
    ? [...new Set(input.assigneeIds)]
    : undefined;
  if (assigneeIds) {
    const assignedMemberCount = await countWorkspaceMembersByUserIds(
      workspaceId,
      assigneeIds,
    );
    if (assignedMemberCount !== assigneeIds.length) {
      throw new TaskAssigneeNotInWorkspaceError();
    }
  }

  try {
    const updateData = {
      ...input,
      ...(input.status === undefined
        ? {}
        : { status: taskStatusByInput[input.status] }),
      ...(input.priority === undefined
        ? {}
        : { priority: taskPriorityByInput[input.priority] }),
      assigneeIds,
    };
    const task = await (
      actorUserId === undefined
        ? updateTaskRecord(projectId, taskId, updateData)
        : updateTaskRecord(projectId, taskId, updateData, actorUserId)
    );
    if (!task) throw new TaskNotFoundError();

    await deleteCachedWorkspaceOverview(workspaceId);

    return {
      ...task,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assignees: task.assignees.map(({ user }) => user),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new TaskNotFoundError();
    }
    throw error;
  }
};
