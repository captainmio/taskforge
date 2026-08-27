import { prisma } from "../config/database.js";
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
