import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskPage from "./Task";

const mocks = vi.hoisted(() => ({
  getProjectTasks: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("../../components/tasks/TaskBoard", () => ({
  default: ({
    tasks,
    onDragEnd,
  }: {
    tasks: { id: number; status: string }[];
    onDragEnd?: (result: {
      draggableId: string;
      source: { droppableId: string; index: number };
      destination: { droppableId: string; index: number };
    }) => void;
  }) => (
    <div>
      {tasks.map((task) => (
        <span key={task.id} data-testid={`task-${task.id}`}>
          {task.status}
        </span>
      ))}
      <button
        type="button"
        onClick={() =>
          onDragEnd?.({
            draggableId: "task-1",
            source: { droppableId: "todo", index: 0 },
            destination: { droppableId: "done", index: 0 },
          })
        }
      >
        Move first task
      </button>
    </div>
  ),
}));

vi.mock("../../services/projects", () => ({
  getProjectById: () =>
    Promise.resolve({
      success: true,
      data: { project: { name: "Task project" } },
    }),
}));

vi.mock("../../services/tasks", () => ({
  createTask: vi.fn(),
  getProjectTasks: mocks.getProjectTasks,
  updateTask: mocks.updateTask,
}));

vi.mock("../../services/auth", () => ({ logout: vi.fn() }));

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    user: {
      id: 7,
      firstname: "Rustem",
      lastname: "Jordan",
      email: "rustem@example.com",
    },
    workspaces: [{ id: 42, name: "Engineering", role: "ADMIN" }],
  }),
}));

const renderPage = () =>
  render(
    <MemoryRouter
      initialEntries={["/workspace/42/projects/25/tasks"]}
    >
      <Routes>
        <Route
          path="/workspace/:id/projects/:projectId/tasks"
          element={<TaskPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("Task page drag and drop", () => {
  beforeEach(() => {
    mocks.getProjectTasks.mockResolvedValue({
      success: true,
      data: {
        tasks: [
          {
            id: 1,
            title: "Move task",
            description: "",
            status: "todo",
            priority: "medium",
            dueDate: null,
            timeEstimate: null,
            createdAt: "2026-08-27T00:00:00.000Z",
            updatedAt: "2026-08-27T00:00:00.000Z",
            assignees: [],
          },
        ],
        pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
      },
    });
    mocks.updateTask.mockResolvedValue({ success: true, data: { id: 1 } });
  });

  it("persists an admin's task destination status and position after a drop", async () => {
    renderPage();

    expect(await screen.findByTestId("task-1")).toHaveTextContent("todo");
    fireEvent.click(screen.getByRole("button", { name: "Move first task" }));

    expect(screen.getByTestId("task-1")).toHaveTextContent("done");
    expect(mocks.updateTask).toHaveBeenCalledWith("42", 25, 1, {
      status: "done",
      position: 0,
    });
  });
});
