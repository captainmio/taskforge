import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaProject = vi.hoisted(() => ({
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
}));

const prismaWorkspaceActivity = vi.hoisted(() => ({ create: vi.fn() }));
const prismaTransaction = vi.hoisted(() => vi.fn());

vi.mock("../../../src/config/database.js", () => ({
  prisma: {
    project: prismaProject,
    workspaceActivity: prismaWorkspaceActivity,
    $transaction: prismaTransaction,
  },
}));

import {
  deleteProjectRecord,
  findProjectAccessByWorkspace,
  findArchivedProjectsByWorkspace,
  findProjectByWorkspace,
  findProjectsByWorkspace,
  restoreProjectRecord,
  updateProjectRecord,
} from "../../../src/repositories/project.repository.js";

describe("project repository soft deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaTransaction.mockImplementation((callback) =>
      callback({
        project: prismaProject,
        workspaceActivity: prismaWorkspaceActivity,
      }),
    );
  });

  it("excludes soft-deleted projects from workspace lists", async () => {
    prismaProject.findMany.mockResolvedValueOnce([]);

    await findProjectsByWorkspace(10);

    expect(prismaProject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 10, deletedAt: null },
      }),
    );
  });

  it("returns only soft-deleted projects for the archive", async () => {
    prismaProject.findMany.mockResolvedValueOnce([]);

    await findArchivedProjectsByWorkspace(10);

    expect(prismaProject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 10, deletedAt: { not: null } },
      }),
    );
  });

  it("retrieves deleted projects so route-level authorization can evaluate them", async () => {
    prismaProject.findFirst.mockResolvedValueOnce(null);

    await findProjectByWorkspace(10, 25);

    expect(prismaProject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 25, workspaceId: 10 },
      }),
    );
  });

  it("selects deletion state for project access checks", async () => {
    prismaProject.findFirst.mockResolvedValueOnce({ deletedAt: null });

    await findProjectAccessByWorkspace(10, 25);

    expect(prismaProject.findFirst).toHaveBeenCalledWith({
      where: { id: 25, workspaceId: 10 },
      select: { deletedAt: true },
    });
  });

  it("marks an active project as deleted instead of removing it", async () => {
    prismaProject.updateMany.mockResolvedValueOnce({ count: 1 });

    await deleteProjectRecord(10, 25);

    expect(prismaProject.updateMany).toHaveBeenCalledWith({
      where: { id: 25, workspaceId: 10, deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("does not update a soft-deleted project", async () => {
    const data = {
      name: "Website Redesign",
      description: "Refresh the marketing site.",
      icon: "desktop" as const,
      status: "planning" as const,
      startDate: null,
      dueDate: null,
      defaultView: "board" as const,
    };
    prismaProject.updateMany.mockResolvedValueOnce({ count: 0 });

    await updateProjectRecord(10, 25, data);

    expect(prismaProject.updateMany).toHaveBeenCalledWith({
      where: { id: 25, workspaceId: 10, deletedAt: null },
      data,
    });
  });

  it("restores an archived project and records the activity in one transaction", async () => {
    prismaProject.findFirst.mockResolvedValueOnce({ name: "Website Redesign" });
    prismaProject.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaWorkspaceActivity.create.mockResolvedValueOnce({});

    await expect(restoreProjectRecord(10, 25, 7)).resolves.toEqual({ count: 1 });
    expect(prismaProject.updateMany).toHaveBeenCalledWith({
      where: { id: 25, workspaceId: 10, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    expect(prismaWorkspaceActivity.create).toHaveBeenCalledWith({
      data: {
        workspaceId: 10,
        actorUserId: 7,
        action: "project_restored",
        details: { projectId: 25, name: "Website Redesign" },
      },
    });
  });
});
