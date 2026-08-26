import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import TaskPage from "./Task";

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
  getProjectById: () => Promise.resolve({ success: false }),
}));

vi.mock("../../services/auth", () => ({ logout: vi.fn() }));

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    user: { firstname: "Rustem", lastname: "Jordan", email: "rustem@example.com" },
  }),
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/workspace/workspace-42/projects/25/tasks"]}>
      <Routes>
        <Route path="/workspace/:id/projects/:projectId/tasks" element={<TaskPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Task page drag and drop", () => {
  it("updates a task's status after it is dropped in another column", () => {
    renderPage();

    expect(screen.getByTestId("task-1")).toHaveTextContent("todo");
    fireEvent.click(screen.getByRole("button", { name: "Move first task" }));

    expect(screen.getByTestId("task-1")).toHaveTextContent("done");
  });
});
