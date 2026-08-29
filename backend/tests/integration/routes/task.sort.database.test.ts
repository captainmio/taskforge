import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../../src/config/database.js";
import {
  ProjectDefaultView,
  ProjectIcon,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  WorkspaceIcon,
  WorkspaceRole,
} from "../../../src/generated/prisma/enums.js";
import { updateTaskRecord } from "../../../src/repositories/task.repository.js";
import { clearTestDatabase } from "../../helpers/database.js";

const createProjectContext = async () => {
  const owner = await prisma.user.create({
    data: {
      email: "task-owner@example.com",
      firstname: "Task",
      lastname: "Owner",
      password: "hashed-password",
    },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: "task-sort-workspace",
      displayName: "Task Sort Workspace",
      description: "Task sorting tests.",
      icon: WorkspaceIcon.code,
      ownerId: owner.id,
      members: { create: { userId: owner.id, role: WorkspaceRole.OWNER } },
    },
  });
  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      createdById: owner.id,
      name: "Task Sort Project",
      description: "Task sorting tests.",
      icon: ProjectIcon.code,
      status: ProjectStatus.active,
      startDate: null,
      dueDate: null,
      defaultView: ProjectDefaultView.board,
    },
  });

  return { owner, project };
};

describe("task ordering with PostgreSQL", () => {
  beforeEach(clearTestDatabase);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("reindexes a status column when a task moves within it", async () => {
    const { owner, project } = await createProjectContext();
    const [firstTask, secondTask, thirdTask] = await Promise.all([0, 1, 2].map((position) =>
      prisma.task.create({
        data: {
          projectId: project.id,
          createdById: owner.id,
          title: `Todo ${position}`,
          description: "",
          status: TaskStatus.todo,
          position,
          priority: TaskPriority.medium,
        },
      }),
    ));
    if (!firstTask || !secondTask || !thirdTask) {
      throw new Error("Task sorting fixture was not created");
    }

    await updateTaskRecord(project.id, thirdTask.id, { position: 0 });

    const saved = await prisma.task.findMany({
      where: { projectId: project.id, status: TaskStatus.todo },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });
    expect(saved).toEqual([
      { id: thirdTask.id, position: 0 },
      { id: firstTask.id, position: 1 },
      { id: secondTask.id, position: 2 },
    ]);
  });

  it("compacts the source column and inserts a moved task in the destination", async () => {
    const { owner, project } = await createProjectContext();
    const [todoFirst, todoSecond, doneTask] = await Promise.all([
      prisma.task.create({ data: { projectId: project.id, createdById: owner.id, title: "Todo first", description: "", status: TaskStatus.todo, position: 0, priority: TaskPriority.medium } }),
      prisma.task.create({ data: { projectId: project.id, createdById: owner.id, title: "Todo second", description: "", status: TaskStatus.todo, position: 1, priority: TaskPriority.medium } }),
      prisma.task.create({ data: { projectId: project.id, createdById: owner.id, title: "Done", description: "", status: TaskStatus.done, position: 0, priority: TaskPriority.medium } }),
    ]);

    await updateTaskRecord(project.id, todoSecond.id, {
      status: TaskStatus.done,
      position: 0,
    });

    const saved = await prisma.task.findMany({
      where: { projectId: project.id },
      orderBy: [{ status: "asc" }, { position: "asc" }],
      select: { id: true, status: true, position: true },
    });
    expect(saved).toEqual([
      { id: todoFirst.id, status: TaskStatus.todo, position: 0 },
      { id: todoSecond.id, status: TaskStatus.done, position: 0 },
      { id: doneTask.id, status: TaskStatus.done, position: 1 },
    ]);
  });
});
