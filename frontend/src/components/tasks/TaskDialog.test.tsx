import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskDialog from "./TaskDialog";
import type { Task } from "./taskTypes";

const mocks = vi.hoisted(() => ({ getWorkspaceMembers: vi.fn() }));

vi.mock("../../services/workspaces", () => ({
  getWorkspaceMembers: mocks.getWorkspaceMembers,
}));

vi.mock("../../services/tasks", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
}));

const task: Task = {
  id: 101,
  title: "Implement task board",
  description: "Show tasks in their project columns.",
  assignee: "Alex Member",
  assignees: [{ id: 7, name: "Alex Member" }],
  dueDate: "2026-09-15",
  timeEstimate: "1d 4h",
  priority: "high",
  status: "in_progress",
};

describe("TaskDialog", () => {
  beforeEach(() => {
    mocks.getWorkspaceMembers.mockResolvedValue({
      success: true,
      data: {
        members: [
          {
            id: 7,
            firstname: "Alex",
            lastname: "Member",
            email: "alex@example.com",
            role: "MEMBER",
            joinedAt: "2026-08-27T00:00:00.000Z",
          },
        ],
        pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
      },
    });
  });

  it("hydrates the time estimate and assignees from the selected task", async () => {
    render(
      <TaskDialog
        task={task}
        initialStatus="todo"
        workspaceId="42"
        projectId={25}
        onClose={vi.fn()}
        onTaskCreated={vi.fn()}
        onTaskUpdated={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("e.g. 1d 4h")).toHaveValue("1d 4h");
    expect(await screen.findByText("Alex Member")).toBeVisible();
    expect(mocks.getWorkspaceMembers).toHaveBeenCalledWith("42", {
      page: 1,
      pageSize: 100,
    });
  });
});
