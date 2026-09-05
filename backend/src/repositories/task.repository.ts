import { prisma } from "../config/database.js";
import { Prisma } from "../generated/prisma/client.js";
import { TaskStatus, type TaskPriority } from "../generated/prisma/enums.js";

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

const taskCommentSelect = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, firstname: true, lastname: true } },
} satisfies Prisma.TaskCommentSelect;

export const createTaskCommentRecord = async (
  projectId: number,
  taskId: number,
  authorUserId: number,
  body: string,
) => prisma.$transaction(async (transaction) => {
  const task = await transaction.task.findFirst({
    where: { id: taskId, projectId, project: { deletedAt: null } },
    select: { id: true },
  });
  if (!task) return null;

  const comment = await transaction.taskComment.create({
    data: { taskId, authorUserId, body },
    select: taskCommentSelect,
  });
  // Both records commit together, so a failed history write cannot leave an
  // untracked comment or a history event for a comment that was never saved.
  await transaction.taskHistory.create({
    data: {
      taskId,
      actorUserId: authorUserId,
      action: "commented",
      changes: { commentId: comment.id },
    },
  });
  return comment;
});

export const findTaskCommentsByTask = async (
  projectId: number,
  taskId: number,
  cursor: number | undefined,
  limit: number,
) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId, project: { deletedAt: null } },
    select: { id: true },
  });
  if (!task) return null;

  const records = await prisma.taskComment.findMany({
    where: { taskId, ...(cursor ? { id: { lt: cursor } } : {}) },
    orderBy: { id: "desc" },
    take: limit + 1,
    select: taskCommentSelect,
  });
  const hasMore = records.length > limit;
  const comments = records.slice(0, limit);
  return { comments, nextCursor: hasMore ? comments.at(-1)?.id ?? null : null };
};

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
  return prisma.$transaction(async (transaction) => {
    const position = await transaction.task.count({
      where: { projectId: data.projectId, status: data.status },
    });
    return transaction.task.create({
      data: {
        ...data,
        position,
        assignees: { create: assigneeIds.map((userId) => ({ userId })) },
        history: {
          create: {
            actorUserId: data.createdById,
            action: "created",
            changes: {
              snapshot: {
                title: data.title,
                description: data.description,
                status: data.status,
                position,
                priority: data.priority,
                dueDate: data.dueDate,
                timeEstimate: data.timeEstimate,
                assigneeIds,
              },
            },
          },
        },
      },
      select: { id: true },
    });
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
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
  actorUserId?: number,
) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const currentTask = await transaction.task.findFirst({
          where: { id: taskId, projectId },
          select: {
            id: true,
            createdById: true,
            title: true,
            description: true,
            status: true,
            position: true,
            priority: true,
            dueDate: true,
            timeEstimate: true,
            assignees: { orderBy: { userId: "asc" }, select: { userId: true } },
          },
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

        let task;
        let nextPosition = currentTask.position;

        if (!isMove) {
          task = await transaction.task.update({
            where: { id: taskId },
            data: updateData,
            select: taskSelect,
          });
        } else {
          const targetTasks = await transaction.task.findMany({
            where: { projectId, status: nextStatus, id: { not: taskId } },
            orderBy: [{ position: "asc" }, { id: "asc" }],
            select: { id: true },
          });
          const requestedPosition = data.position ?? targetTasks.length;
          nextPosition = Math.min(
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

          task = await transaction.task.findUnique({
            where: { id: taskId },
            select: taskSelect,
          });
        }

        const nextAssigneeIds = assigneeIds ?? currentTask.assignees.map(({ userId }) => userId);
        type HistoryValue = string | number | null | number[];
        type HistoryChange = {
          from: HistoryValue;
          to: HistoryValue;
        };
        const changes: Record<string, HistoryChange> = {};
        const recordChange = (
          field: string,
          from: HistoryValue,
          to: HistoryValue,
        ) => {
          if (JSON.stringify(from) !== JSON.stringify(to)) {
            changes[field] = { from, to };
          }
        };

        recordChange("title", currentTask.title, data.title ?? currentTask.title);
        recordChange("description", currentTask.description, data.description ?? currentTask.description);
        recordChange("status", currentTask.status, nextStatus);
        recordChange("position", currentTask.position, nextPosition);
        recordChange("priority", currentTask.priority, data.priority ?? currentTask.priority);
        recordChange(
          "dueDate",
          currentTask.dueDate,
          data.dueDate === undefined ? currentTask.dueDate : data.dueDate,
        );
        recordChange(
          "timeEstimate",
          currentTask.timeEstimate,
          data.timeEstimate === undefined ? currentTask.timeEstimate : data.timeEstimate,
        );
        recordChange(
          "assigneeIds",
          currentTask.assignees.map(({ userId }) => userId),
          nextAssigneeIds,
        );

        const effectiveChanges = Object.fromEntries(
          Object.entries(changes).filter(
            ([, change]) =>
              JSON.stringify(change.from) !== JSON.stringify(change.to),
          ),
        );
        if (Object.keys(effectiveChanges).length > 0) {
          await transaction.taskHistory.create({
            data: {
              taskId,
              actorUserId: actorUserId ?? currentTask.createdById,
              action: "updated",
              changes: effectiveChanges as Prisma.InputJsonObject,
            },
          });
        }

        return task;
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

const taskHistorySelect = {
  id: true,
  action: true,
  changes: true,
  createdAt: true,
  actor: {
    select: { id: true, firstname: true, lastname: true, email: true },
  },
} satisfies Prisma.TaskHistorySelect;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getAssigneeIds = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number")
    : [];

const collectHistoryAssigneeIds = (changes: unknown): number[] => {
  if (!isRecord(changes)) return [];
  const snapshot = isRecord(changes.snapshot) ? changes.snapshot : null;
  const assigneeChange = isRecord(changes.assigneeIds)
    ? changes.assigneeIds
    : null;

  return [
    ...getAssigneeIds(snapshot?.assigneeIds),
    ...getAssigneeIds(assigneeChange?.from),
    ...getAssigneeIds(assigneeChange?.to),
  ];
};

const addResolvedAssigneeNames = (
  changes: unknown,
  namesById: ReadonlyMap<number, string>,
): unknown => {
  if (!isRecord(changes)) return changes;
  const resolvedChanges = { ...changes };
  const snapshot = isRecord(changes.snapshot) ? changes.snapshot : null;
  if (snapshot) {
    resolvedChanges.snapshot = {
      ...snapshot,
      assigneeNames: getAssigneeIds(snapshot.assigneeIds).map(
        (id) => namesById.get(id) ?? `User ${id}`,
      ),
    };
  }

  const assigneeChange = isRecord(changes.assigneeIds)
    ? changes.assigneeIds
    : null;
  if (assigneeChange) {
    resolvedChanges.assigneeIds = {
      ...assigneeChange,
      fromNames: getAssigneeIds(assigneeChange.from).map(
        (id) => namesById.get(id) ?? `User ${id}`,
      ),
      toNames: getAssigneeIds(assigneeChange.to).map(
        (id) => namesById.get(id) ?? `User ${id}`,
      ),
    };
  }

  return resolvedChanges;
};

export const resolveTaskHistoryAssigneeNames = async <
  T extends { changes: unknown },
>(records: readonly T[]): Promise<T[]> => {
  const assigneeIds = [
    ...new Set(records.flatMap((record) => collectHistoryAssigneeIds(record.changes))),
  ];
  if (assigneeIds.length === 0) return [...records];

  const users = await prisma.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true, firstname: true, lastname: true },
  });
  const namesById = new Map(
    users.map((user) => [user.id, `${user.firstname} ${user.lastname}`]),
  );

  return records.map((record) => ({
    ...record,
    changes: addResolvedAssigneeNames(record.changes, namesById),
  }));
};

export const findTaskHistoryByTask = async (
  projectId: number,
  taskId: number,
  cursor: number | undefined,
  limit: number,
) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: { id: true },
  });
  if (!task) return null;

  const records = await prisma.taskHistory.findMany({
    where: { taskId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor } } : {}),
    skip: cursor ? 1 : 0,
    take: limit + 1,
    select: taskHistorySelect,
  });
  const hasMore = records.length > limit;
  const history = hasMore ? records.slice(0, limit) : records;
  const historyWithAssigneeNames = await resolveTaskHistoryAssigneeNames(history);

  return {
    history: historyWithAssigneeNames,
    nextCursor: hasMore ? history.at(-1)?.id ?? null : null,
  };
};
