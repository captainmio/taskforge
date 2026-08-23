import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaProject = vi.hoisted(() => ({
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("../../../src/config/database.js", () => ({
  prisma: { project: prismaProject },
}));

import {
  deleteProjectRecord,
  findProjectByWorkspace,
  findProjectsByWorkspace,
  updateProjectRecord,
} from "../../../src/repositories/project.repository.js";

describe("project repository soft deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("excludes soft-deleted projects from project lookups", async () => {
    prismaProject.findFirst.mockResolvedValueOnce(null);

    await findProjectByWorkspace(10, 25);

    expect(prismaProject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 25, workspaceId: 10, deletedAt: null },
      }),
    );
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
});
