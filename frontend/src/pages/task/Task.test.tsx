import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskPage from "./Task";

const mocks = vi.hoisted(() => ({
  getProjectById: vi.fn(),
  logout: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../../services/projects", () => ({
  getProjectById: mocks.getProjectById,
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

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => mocks.navigate };
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/workspace/workspace-42/projects/25/tasks"]}>
      <Routes>
        <Route path="/workspace/:id/projects/:projectId/tasks" element={<TaskPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Task page", () => {
  beforeEach(() => {
    mocks.getProjectById.mockReset();
    mocks.logout.mockReset();
    mocks.navigate.mockReset();
    mocks.getProjectById.mockResolvedValue({
      success: true,
      data: { project: { name: "Website Redesign" } },
    });
  });

  it("loads the project name for the current workspace and project", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Website Redesign" })).toBeVisible();
    expect(mocks.getProjectById).toHaveBeenCalledWith("workspace-42", 25);
  });

  it("filters board cards by task title", () => {
    renderPage();

    expect(screen.getByRole("button", { name: /Implement login flow/ })).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Search tasks" }), {
      target: { value: "database schema" },
    });

    expect(screen.queryByRole("button", { name: /Implement login flow/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Review database schema/ })).toBeVisible();
  });

  it("opens and closes a new task dialog", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "New Task" }));
    expect(screen.getByRole("dialog", { name: "Task details" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Create task" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Task details" })).toBeNull();
  });

  it("opens an existing task with its details ready to edit", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Create wireframes/ }));

    expect(screen.getByRole("textbox", { name: "Task title" })).toHaveValue("Create wireframes");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeVisible();
  });

  it("keeps the generic title when the project request fails", async () => {
    mocks.getProjectById.mockRejectedValue(new Error("Project unavailable"));
    renderPage();

    await waitFor(() => expect(mocks.getProjectById).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeVisible();
  });
});
