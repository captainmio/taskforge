import { prisma } from "../config/database.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { TaskPriority, TaskStatus } from "../generated/prisma/enums.js";

export interface CreateTaskData {
  projectId: number;
  createdById: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  timeEstimate: string | null;
  assigneeIds: number[];
}

export interface UpdateTaskData {
  title?: string | undefined;
  description?: string | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  dueDate?: string | null | undefined;
  timeEstimate?: string | null | undefined;
  assigneeIds?: number[] | undefined;
}

export const createTaskRecord = async ({ assigneeIds, ...data }: CreateTaskData) =>
  prisma.task.create({
    data: {
      ...data,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
    },
    select: { id: true },
  });

export const findTasksByProject = async (
  projectId: number,
  skip: number,
  take: number,
) => {
  const where = { projectId };
  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        timeEstimate: true,
        createdAt: true,
        updatedAt: true,
        assignees: {
          orderBy: { userId: "asc" },
          select: {
            user: {
              select: { id: true, firstname: true, lastname: true, email: true },
            },
          },
        },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total };
};

export const updateTaskRecord = async (
  projectId: number,
  taskId: number,
  { assigneeIds, ...data }: UpdateTaskData,
) => {
  const updateData: Prisma.TaskUpdateInput = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.timeEstimate !== undefined) updateData.timeEstimate = data.timeEstimate;
  if (assigneeIds !== undefined) {
    updateData.assignees = {
      deleteMany: {},
      create: assigneeIds.map((userId) => ({ userId })),
    };
  }

  return prisma.task.update({
    where: { id: taskId, projectId },
    data: updateData,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      timeEstimate: true,
      createdAt: true,
      updatedAt: true,
      assignees: {
        orderBy: { userId: "asc" },
        select: {
          user: {
            select: { id: true, firstname: true, lastname: true, email: true },
          },
        },
      },
    },
  });
};
