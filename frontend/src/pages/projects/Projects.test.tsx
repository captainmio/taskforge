import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Projects from "./Projects";

const mocks = vi.hoisted(() => ({
  getProjects: vi.fn(),
  deleteProject: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../../services/projects", () => ({
  deleteProject: mocks.deleteProject,
  getProjects: mocks.getProjects,
}));

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    user: {
      id: 1,
      firstname: "Rustem",
      lastname: "Jordan",
      email: "rustem@example.com",
    },
  }),
}));

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/workspace/workspace-42/projects"]}>
      <Routes>
        <Route path="/workspace/:id/projects" element={<Projects />} />
      </Routes>
    </MemoryRouter>,
  );

const projects = [
  {
    id: 25,
    name: "Website Redesign",
    description: "Refresh the marketing site.",
    icon: "desktop" as const,
    status: "planning" as const,
    startDate: "2026-09-01T00:00:00.000Z",
    dueDate: "2026-10-01T00:00:00.000Z",
    defaultView: "board" as const,
    createdAt: "2026-08-22T00:00:00.000Z",
  },
];

const projectListFor = (currentUserRole: "OWNER" | "ADMIN" | "MEMBER") => ({
  success: true as const,
  message: "Projects retrieved",
  data: { projects, currentUserRole },
});

describe("Projects page", () => {
  beforeEach(() => {
    mocks.getProjects.mockReset();
    mocks.deleteProject.mockReset();
    mocks.navigate.mockReset();
    mocks.getProjects.mockResolvedValue(projectListFor("MEMBER"));
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "shows Create project to a workspace %s",
    async (role) => {
      mocks.getProjects.mockResolvedValue(projectListFor(role));
      renderPage();

      const createButton = await screen.findByRole("button", {
        name: "Create project",
      });
      fireEvent.click(createButton);

      expect(mocks.navigate).toHaveBeenCalledWith(
        "/workspace/workspace-42/projects/create",
      );
    },
  );

  it("hides Create project from a workspace member", async () => {
    renderPage();

    await screen.findByText("Website Redesign");
    expect(screen.queryByRole("button", { name: "Create project" })).toBeNull();
  });

  it("loads project rows from the dedicated project-list API", async () => {
    renderPage();

    expect(await screen.findByText("Website Redesign")).toBeVisible();
    expect(mocks.getProjects).toHaveBeenCalledWith("workspace-42");
  });

  it("shows project actions for an owner from the project-list role", async () => {
    mocks.getProjects.mockResolvedValue(projectListFor("OWNER"));
    renderPage();

    expect(await screen.findByText("Website Redesign")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Actions for Website Redesign" }),
    ).toBeVisible();
  });

  it("shows the empty state when the project-list request fails", async () => {
    mocks.getProjects.mockRejectedValue(new Error("Projects unavailable"));
    renderPage();

    expect(await screen.findByText("No projects yet")).toBeVisible();
  });

  it("closes the delete confirmation without deleting the project", async () => {
    mocks.getProjects.mockResolvedValue(projectListFor("OWNER"));
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Actions for Website Redesign",
      }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(
      screen.getByRole("dialog", { name: "Delete project" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Delete project" })).toBeNull();
    expect(mocks.deleteProject).not.toHaveBeenCalled();
  });

  it("deletes the selected project after modal confirmation", async () => {
    mocks.getProjects.mockResolvedValue(projectListFor("OWNER"));
    mocks.deleteProject.mockResolvedValue({
      success: true,
      message: "Project deleted",
      data: { id: 25 },
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Actions for Website Redesign",
      }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));

    await waitFor(() => {
      expect(mocks.deleteProject).toHaveBeenCalledWith("workspace-42", 25);
    });
    await waitFor(() => {
      expect(screen.queryByText("Website Redesign")).toBeNull();
    });
  });

  it("disables delete modal actions while deletion is pending", async () => {
    mocks.getProjects.mockResolvedValue(projectListFor("OWNER"));
    mocks.deleteProject.mockReturnValue(new Promise(() => undefined));
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Actions for Website Redesign",
      }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));

    await waitFor(() => {
      const modal = screen.getByRole("dialog", { name: "Delete project" });
      expect(
        within(modal).getByRole("button", { name: "Deleting…" }),
      ).toBeDisabled();
      expect(
        within(modal).getByRole("button", { name: "Cancel" }),
      ).toBeDisabled();
    });
    expect(mocks.deleteProject).toHaveBeenCalledTimes(1);
  });
});
