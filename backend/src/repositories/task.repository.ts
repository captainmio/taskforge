import { prisma } from "../config/database.js";
import { Prisma } from "../generated/prisma/client.js";
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
  position?: number | undefined;
  priority?: TaskPriority | undefined;
  dueDate?: string | null | undefined;
  timeEstimate?: string | null | undefined;
  assigneeIds?: number[] | undefined;
}

export const createTaskRecord = async ({ assigneeIds, ...data }: CreateTaskData) => {
  const position = await prisma.task.count({
    where: { projectId: data.projectId, status: data.status },
  });

  return prisma.task.create({
    data: {
      ...data,
      position,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
    },
    select: { id: true },
  });
};

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  position: true,
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
} satisfies Prisma.TaskSelect;

export const findTasksByProject = async (
  projectId: number,
  skip: number,
  take: number,
) => {
  const where = { projectId };
  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { position: "asc" }, { id: "asc" }],
      skip,
      take,
      select: taskSelect,
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
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const currentTask = await transaction.task.findFirst({
          where: { id: taskId, projectId },
          select: { id: true, status: true },
        });
        if (!currentTask) return null;

        const nextStatus = data.status ?? currentTask.status;
        const isMove =
          data.position !== undefined || nextStatus !== currentTask.status;
        const updateData: Prisma.TaskUpdateInput = {};

        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
        if (data.timeEstimate !== undefined) updateData.timeEstimate = data.timeEstimate;
        if (assigneeIds !== undefined) {
          updateData.assignees = {
            deleteMany: {},
            create: assigneeIds.map((userId) => ({ userId })),
          };
        }

        if (!isMove) {
          return transaction.task.update({
            where: { id: taskId },
            data: updateData,
            select: taskSelect,
          });
        }

        const targetTasks = await transaction.task.findMany({
          where: { projectId, status: nextStatus, id: { not: taskId } },
          orderBy: [{ position: "asc" }, { id: "asc" }],
          select: { id: true },
        });
        const requestedPosition = data.position ?? targetTasks.length;
        const nextPosition = Math.min(
          Math.max(requestedPosition, 0),
          targetTasks.length,
        );
        const reorderedTargetIds = targetTasks.map((task) => task.id);
        reorderedTargetIds.splice(nextPosition, 0, taskId);

        const sourceTasks =
          nextStatus === currentTask.status
            ? []
            : await transaction.task.findMany({
                where: {
                  projectId,
                  status: currentTask.status,
                  id: { not: taskId },
                },
                orderBy: [{ position: "asc" }, { id: "asc" }],
                select: { id: true },
              });

        updateData.status = nextStatus;
        updateData.position = nextPosition;
        await transaction.task.update({ where: { id: taskId }, data: updateData });

        await Promise.all([
          ...sourceTasks.map((task, position) =>
            transaction.task.update({ where: { id: task.id }, data: { position } }),
          ),
          ...reorderedTargetIds.map((id, position) =>
            transaction.task.update({ where: { id }, data: { position } }),
          ),
        ]);

        return transaction.task.findUnique({ where: { id: taskId }, select: taskSelect });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      ) {
        continue;
      }
      throw error;
    }
  }

  return null;
};
