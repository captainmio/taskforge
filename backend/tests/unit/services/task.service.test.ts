import { deleteCachedWorkspaceOverview } from "../../../src/cache/workspace-overview.cache.js";
import { TaskPriority, TaskStatus, WorkspaceRole } from "../../../src/generated/prisma/enums.js";
import { findProjectByWorkspace } from "../../../src/repositories/project.repository.js";
import { createTaskRecord, updateTaskRecord } from "../../../src/repositories/task.repository.js";
import { countWorkspaceMembersByUserIds } from "../../../src/repositories/workspace.repository.js";
import { createTask, updateTask } from "../../../src/services/task.service.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/cache/workspace-overview.cache.js", () => ({
  deleteCachedWorkspaceOverview: vi.fn(),
}));

vi.mock("../../../src/repositories/project.repository.js", () => ({
  findProjectByWorkspace: vi.fn(),
}));

vi.mock("../../../src/repositories/task.repository.js", () => ({
  createTaskRecord: vi.fn(),
  updateTaskRecord: vi.fn(),
}));

vi.mock("../../../src/repositories/workspace.repository.js", () => ({
  countWorkspaceMembersByUserIds: vi.fn(),
}));

const taskRecord = {
  id: 101,
  title: "Implement login flow",
  description: null,
  status: TaskStatus.todo,
  priority: TaskPriority.medium,
  dueDate: null,
  timeEstimate: null,
  position: 0,
  createdAt: new Date("2026-08-27T00:00:00.000Z"),
  updatedAt: new Date("2026-08-27T00:00:00.000Z"),
  assignees: [],
};

describe("task overview cache invalidation", () => {
  beforeEach(() => {
    vi.mocked(findProjectByWorkspace).mockResolvedValue({ id: 25 } as never);
    vi.mocked(countWorkspaceMembersByUserIds).mockResolvedValue(0);
    vi.mocked(createTaskRecord).mockResolvedValue(taskRecord as never);
    vi.mocked(updateTaskRecord).mockResolvedValue(taskRecord as never);
    vi.mocked(deleteCachedWorkspaceOverview).mockResolvedValue(undefined);
  });

  it("clears the workspace overview cache after creating a task", async () => {
    await createTask(42, 25, 7, WorkspaceRole.MEMBER, {
      title: "Implement login flow",
      description: "Connect the sign-in form to authentication.",
      status: "todo",
      priority: "medium",
      dueDate: null,
      timeEstimate: null,
      assigneeIds: [],
    });

    expect(deleteCachedWorkspaceOverview).toHaveBeenCalledWith(42);
  });

  it("clears the workspace overview cache after updating a task", async () => {
    await updateTask(42, 25, 101, WorkspaceRole.MEMBER, {
      status: "in_progress",
    });

    expect(deleteCachedWorkspaceOverview).toHaveBeenCalledWith(42);
  });
});
