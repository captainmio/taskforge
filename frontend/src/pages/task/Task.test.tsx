import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskPage from "./Task";

const mocks = vi.hoisted(() => ({
  getProjectById: vi.fn(),
  getProjectTasks: vi.fn(),
  logout: vi.fn(),
  navigate: vi.fn(),
  useProjectTaskRealtime: vi.fn(),
}));

vi.mock("../../services/projects", () => ({
  getProjectById: mocks.getProjectById,
}));

vi.mock("../../services/tasks", () => ({
  createTask: vi.fn(),
  getProjectTasks: mocks.getProjectTasks,
  updateTask: vi.fn(),
}));

vi.mock("../../services/auth", () => ({ logout: mocks.logout }));

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    user: {
      firstname: "Rustem",
      lastname: "Jordan",
      email: "rustem@example.com",
    },
  }),
}));

vi.mock("../../hooks/useProjectTaskRealtime", () => ({
  useProjectTaskRealtime: mocks.useProjectTaskRealtime,
}));

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => mocks.navigate };
});

const renderPage = () =>
  render(
    <MemoryRouter
      initialEntries={["/workspace/workspace-42/projects/25/tasks"]}
    >
      <Routes>
        <Route
          path="/workspace/:id/projects/:projectId/tasks"
          element={<TaskPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("Task page", () => {
  beforeEach(() => {
    mocks.getProjectById.mockReset();
    mocks.getProjectTasks.mockReset();
    mocks.logout.mockReset();
    mocks.navigate.mockReset();
    mocks.useProjectTaskRealtime.mockReset();
    mocks.getProjectById.mockResolvedValue({
      success: true,
      data: { project: { name: "Website Redesign" } },
    });
    mocks.getProjectTasks.mockResolvedValue({
      success: true,
      data: {
        tasks: [
          {
            id: 1,
            title: "Implement login flow",
            description: "Connect the sign-in form to authentication.",
            status: "todo",
            priority: "medium",
            dueDate: null,
            timeEstimate: null,
            createdAt: "2026-08-27T00:00:00.000Z",
            updatedAt: "2026-08-27T00:00:00.000Z",
            assignees: [],
          },
          {
            id: 10,
            title: "Create wireframes",
            description: "Prepare the first design wireframes.",
            status: "done",
            priority: "low",
            dueDate: null,
            timeEstimate: null,
            createdAt: "2026-08-27T00:00:00.000Z",
            updatedAt: "2026-08-27T00:00:00.000Z",
            assignees: [],
          },
          {
            id: 8,
            title: "Review database schema",
            description: "Review the database schema before implementation.",
            status: "in_review",
            priority: "high",
            dueDate: null,
            timeEstimate: null,
            createdAt: "2026-08-27T00:00:00.000Z",
            updatedAt: "2026-08-27T00:00:00.000Z",
            assignees: [],
          },
        ],
        pagination: { page: 1, pageSize: 100, total: 3, totalPages: 1 },
      },
    });
  });

  it("loads the project name for the current workspace and project", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Website Redesign" }),
    ).toBeVisible();
    expect(mocks.getProjectById).toHaveBeenCalledWith("workspace-42", 25);
  });

  it("filters board cards by task title", async () => {
    renderPage();

    expect(
      await screen.findByRole("button", { name: /Implement login flow/ }),
    ).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Search tasks" }), {
      target: { value: "database schema" },
    });

    expect(
      screen.queryByRole("button", { name: /Implement login flow/ }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /Review database schema/ }),
    ).toBeVisible();
  });

  it("opens and closes a new task dialog", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "New Task" }));
    expect(screen.getByRole("dialog", { name: "Task details" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Create task" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Task details" })).toBeNull();
  });

  it("opens an existing task with its details ready to edit", async () => {
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: /Create wireframes/ }),
    );

    expect(screen.getByRole("textbox", { name: "Task title" })).toHaveValue(
      "Create wireframes",
    );
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });

  it("keeps the generic title when the project request fails", async () => {
    mocks.getProjectById.mockRejectedValue(new Error("Project unavailable"));
    renderPage();

    await waitFor(() => expect(mocks.getProjectById).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeVisible();
  });

  it("replaces a board card when a real-time task update arrives", async () => {
    renderPage();
    await screen.findByRole("button", { name: /Implement login flow/ });

    const realtimeOptions = mocks.useProjectTaskRealtime.mock.calls.at(-1)?.[0];
    realtimeOptions?.onTaskUpdated({
      id: 1,
      title: "Implement secure login flow",
      description: "Connect the sign-in form to authentication.",
      status: "done",
      priority: "high",
      dueDate: null,
      timeEstimate: null,
      createdAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-29T00:00:00.000Z",
      assignees: [],
    });

    expect(
      await screen.findByRole("button", { name: /Implement secure login flow/ }),
    ).toBeVisible();
  });

  it("refreshes tasks when a real-time creation event arrives", async () => {
    renderPage();
    await screen.findByRole("button", { name: /Implement login flow/ });
    mocks.getProjectTasks.mockResolvedValueOnce({
      success: true,
      data: {
        tasks: [{
          id: 11,
          title: "New real-time task",
          description: "Created in another browser.",
          status: "todo",
          priority: "medium",
          dueDate: null,
          timeEstimate: null,
          createdAt: "2026-08-29T00:00:00.000Z",
          updatedAt: "2026-08-29T00:00:00.000Z",
          assignees: [],
        }],
        pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
      },
    });

    const realtimeOptions = mocks.useProjectTaskRealtime.mock.calls.at(-1)?.[0];
    realtimeOptions?.onTaskCreated();

    expect(
      await screen.findByRole("button", { name: /New real-time task/ }),
    ).toBeVisible();
  });
});
