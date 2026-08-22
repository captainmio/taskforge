import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCachedWorkspaceOverview } from "../../../src/cache/workspace-overview.cache.js";
import { ProjectCreationForbiddenError } from "../../../src/errors/project.errors.js";
import {
  ProjectStatus,
  WorkspaceRole,
} from "../../../src/generated/prisma/enums.js";
import { createProjectRecord } from "../../../src/repositories/project.repository.js";
import { createProject } from "../../../src/services/project.service.js";

vi.mock("../../../src/repositories/project.repository.js", () => ({
  createProjectRecord: vi.fn(),
}));

vi.mock("../../../src/cache/workspace-overview.cache.js", () => ({
  deleteCachedWorkspaceOverview: vi.fn(),
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
  });

  it("rejects a member before writing a project", async () => {
    await expect(
      createProject(10, 7, WorkspaceRole.MEMBER, input),
    ).rejects.toBeInstanceOf(ProjectCreationForbiddenError);
    expect(createProjectRecord).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
  });
});
