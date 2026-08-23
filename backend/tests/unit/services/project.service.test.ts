import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCachedWorkspaceOverview } from "../../../src/cache/workspace-overview.cache.js";
import {
  deleteCachedProjectList,
  getCachedProjectList,
  setCachedProjectList,
} from "../../../src/cache/project-list.cache.js";
import {
  ProjectCreationForbiddenError,
  ProjectDeletionForbiddenError,
  ProjectNotFoundError,
} from "../../../src/errors/project.errors.js";
import {
  ProjectStatus,
  WorkspaceRole,
} from "../../../src/generated/prisma/enums.js";
import {
  createProjectRecord,
  deleteProjectRecord,
  findProjectsByWorkspace,
} from "../../../src/repositories/project.repository.js";
import {
  createProject,
  deleteProject,
  getProjects,
} from "../../../src/services/project.service.js";

vi.mock("../../../src/repositories/project.repository.js", () => ({
  createProjectRecord: vi.fn(),
  deleteProjectRecord: vi.fn(),
  findProjectsByWorkspace: vi.fn(),
}));

vi.mock("../../../src/cache/workspace-overview.cache.js", () => ({
  deleteCachedWorkspaceOverview: vi.fn(),
}));

vi.mock("../../../src/cache/project-list.cache.js", () => ({
  deleteCachedProjectList: vi.fn(),
  getCachedProjectList: vi.fn(),
  setCachedProjectList: vi.fn(),
}));

const input = {
  projectName: "Website Redesign",
  description: "Refresh the marketing site.",
  icon: "desktop" as const,
  status: "on-hold" as const,
  startDate: "2026-09-01",
  dueDate: "2026-10-01",
  defaultView: "board" as const,
};

describe("createProject", () => {
  beforeEach(() => {
    vi.mocked(deleteCachedWorkspaceOverview).mockResolvedValue(undefined);
    vi.mocked(deleteCachedProjectList).mockResolvedValue(undefined);
  });

  it.each([WorkspaceRole.OWNER, WorkspaceRole.ADMIN])(
    "allows a workspace %s to create a project",
    async (actorRole) => {
      vi.mocked(createProjectRecord).mockResolvedValue({ id: 25 } as never);

      await expect(createProject(10, 7, actorRole, input)).resolves.toEqual({
        id: 25,
      });
      expect(createProjectRecord).toHaveBeenCalledWith({
        workspaceId: 10,
        createdById: 7,
        name: "Website Redesign",
        description: "Refresh the marketing site.",
        icon: "desktop",
        status: ProjectStatus.on_hold,
        startDate: new Date("2026-09-01T00:00:00.000Z"),
        dueDate: new Date("2026-10-01T00:00:00.000Z"),
        defaultView: "board",
      });
      expect(deleteCachedWorkspaceOverview).toHaveBeenCalledWith(10);
      expect(deleteCachedProjectList).toHaveBeenCalledWith(10);
    },
  );

  it("stores null dates when the project form omits them", async () => {
    vi.mocked(createProjectRecord).mockResolvedValue({ id: 25 } as never);

    await createProject(10, 7, WorkspaceRole.OWNER, {
      ...input,
      startDate: "",
      dueDate: "",
    });

    expect(createProjectRecord).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: null, dueDate: null }),
    );
    expect(deleteCachedWorkspaceOverview).toHaveBeenCalledWith(10);
    expect(deleteCachedProjectList).toHaveBeenCalledWith(10);
  });

  it("rejects a member before writing a project", async () => {
    await expect(
      createProject(10, 7, WorkspaceRole.MEMBER, input),
    ).rejects.toBeInstanceOf(ProjectCreationForbiddenError);
    expect(createProjectRecord).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedProjectList).not.toHaveBeenCalled();
  });
});

describe("getProjects", () => {
  const cachedProjects = [{
    id: 25,
    name: "Website Redesign",
    description: "Refresh the marketing site.",
    icon: "desktop" as const,
    status: ProjectStatus.planning,
    startDate: "2026-09-01T00:00:00.000Z",
    dueDate: "2026-10-01T00:00:00.000Z",
    defaultView: "board" as const,
    createdAt: "2026-08-22T00:00:00.000Z",
  }];

  beforeEach(() => {
    vi.mocked(getCachedProjectList).mockResolvedValue(null);
    vi.mocked(setCachedProjectList).mockResolvedValue(undefined);
  });

  it("returns a cached project list without reading PostgreSQL", async () => {
    vi.mocked(getCachedProjectList).mockResolvedValueOnce(cachedProjects);

    await expect(getProjects(10)).resolves.toEqual(cachedProjects);
    expect(findProjectsByWorkspace).not.toHaveBeenCalled();
    expect(setCachedProjectList).not.toHaveBeenCalled();
  });

  it("loads, normalizes, and caches projects after a cache miss", async () => {
    vi.mocked(findProjectsByWorkspace).mockResolvedValueOnce([
      {
        ...cachedProjects[0],
        startDate: new Date("2026-09-01T00:00:00.000Z"),
        dueDate: new Date("2026-10-01T00:00:00.000Z"),
        createdAt: new Date("2026-08-22T00:00:00.000Z"),
      },
    ] as never);

    await expect(getProjects(10)).resolves.toEqual(cachedProjects);
    expect(findProjectsByWorkspace).toHaveBeenCalledWith(10);
    expect(setCachedProjectList).toHaveBeenCalledWith(10, cachedProjects);
  });
});

describe("deleteProject", () => {
  beforeEach(() => {
    vi.mocked(deleteCachedWorkspaceOverview).mockResolvedValue(undefined);
    vi.mocked(deleteCachedProjectList).mockResolvedValue(undefined);
  });

  it.each([WorkspaceRole.OWNER, WorkspaceRole.ADMIN])(
    "allows a workspace %s to delete its project and clears cached lists",
    async (actorRole) => {
      vi.mocked(deleteProjectRecord).mockResolvedValueOnce({ count: 1 });

      await expect(deleteProject(10, 25, actorRole)).resolves.toEqual({ id: 25 });
      expect(deleteProjectRecord).toHaveBeenCalledWith(10, 25);
      expect(deleteCachedWorkspaceOverview).toHaveBeenCalledWith(10);
      expect(deleteCachedProjectList).toHaveBeenCalledWith(10);
    },
  );

  it("rejects a member before attempting deletion", async () => {
    await expect(deleteProject(10, 25, WorkspaceRole.MEMBER))
      .rejects.toBeInstanceOf(ProjectDeletionForbiddenError);
    expect(deleteProjectRecord).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedProjectList).not.toHaveBeenCalled();
  });

  it("returns not found without clearing caches when the project is absent", async () => {
    vi.mocked(deleteProjectRecord).mockResolvedValueOnce({ count: 0 });

    await expect(deleteProject(10, 25, WorkspaceRole.OWNER))
      .rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedProjectList).not.toHaveBeenCalled();
  });
});
