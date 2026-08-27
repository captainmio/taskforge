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
