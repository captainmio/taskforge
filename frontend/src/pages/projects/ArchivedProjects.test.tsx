import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArchivedProjects from "./ArchivedProjects";

const mocks = vi.hoisted(() => ({
  getArchivedProjects: vi.fn(),
  restoreProject: vi.fn(),
}));

vi.mock("../../services/projects", () => ({
  getArchivedProjects: mocks.getArchivedProjects,
  restoreProject: mocks.restoreProject,
}));

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    user: {
      firstname: "Alex",
      lastname: "Ng",
      email: "alex@example.com",
    },
  }),
}));

const archivedProject = {
  id: 25,
  name: "Website Redesign",
  description: "Refresh the marketing site.",
  icon: "desktop",
  status: "planning",
  startDate: null,
  dueDate: null,
  defaultView: "board",
  createdAt: "2026-08-22T00:00:00.000Z",
  taskCount: 2,
  completedTaskCount: 1,
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/workspace/42/projects/archived"]}>
      <Routes>
        <Route
          path="/workspace/:id/projects/archived"
          element={<ArchivedProjects />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("ArchivedProjects", () => {
  beforeEach(() => {
    mocks.getArchivedProjects.mockReset();
    mocks.restoreProject.mockReset();
    mocks.getArchivedProjects.mockResolvedValue({
      data: { projects: [archivedProject], currentUserRole: "OWNER" },
    });
    mocks.restoreProject.mockResolvedValue({ success: true, data: { id: 25 } });
  });

  it("asks the owner to confirm before restoring a project", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Restore project" }));

    const dialog = screen.getByRole("dialog", { name: "Restore project?" });
    expect(dialog).toHaveTextContent(
      "Restore Website Redesign?",
    );
    expect(mocks.restoreProject).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Restore project" }),
    );

    await waitFor(() =>
      expect(mocks.restoreProject).toHaveBeenCalledWith("42", 25),
    );
    expect(screen.queryByText("Website Redesign")).not.toBeInTheDocument();
  });

  it("does not show restore controls to an admin", async () => {
    mocks.getArchivedProjects.mockResolvedValueOnce({
      data: { projects: [archivedProject], currentUserRole: "ADMIN" },
    });
    renderPage();

    await screen.findByText("Website Redesign");
    expect(screen.queryByRole("button", { name: "Restore project" })).toBeNull();
  });
});
