import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Projects from "./Projects";

const mocks = vi.hoisted(() => ({
  getProjects: vi.fn(),
  getWorkspaceOverview: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../../services/projects", () => ({
  getProjects: mocks.getProjects,
}));

vi.mock("../../services/workspaces", () => ({
  getWorkspaceOverview: mocks.getWorkspaceOverview,
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
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
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

const workspaceOverviewFor = (role: "OWNER" | "ADMIN" | "MEMBER") => ({
  success: true as const,
  message: "Workspace overview retrieved",
  data: {
    id: 42,
    displayName: "Engineering",
    description: "",
    icon: "code" as const,
    createdAt: "2026-08-18T12:00:00.000Z",
    members: [
      {
        id: 1,
        firstname: "Rustem",
        lastname: "Jordan",
        email: "rustem@example.com",
        role,
        joinedAt: "2026-08-18T12:00:00.000Z",
      },
    ],
  },
});

const projectList = {
  success: true as const,
  message: "Projects retrieved",
  data: [
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
  ],
};

describe("Projects page", () => {
  beforeEach(() => {
    mocks.getProjects.mockReset();
    mocks.getWorkspaceOverview.mockReset();
    mocks.navigate.mockReset();
    mocks.getProjects.mockResolvedValue(projectList);
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "shows Create project to a workspace %s",
    async (role) => {
      mocks.getWorkspaceOverview.mockResolvedValue(workspaceOverviewFor(role));
      renderPage();

      const createButton = await screen.findByRole("button", { name: "Create project" });
      fireEvent.click(createButton);

      expect(mocks.navigate).toHaveBeenCalledWith("/workspace/workspace-42/projects/create");
    },
  );

  it("hides Create project from a workspace member", async () => {
    mocks.getWorkspaceOverview.mockResolvedValue(workspaceOverviewFor("MEMBER"));
    renderPage();

    await waitFor(() => {
      expect(mocks.getWorkspaceOverview).toHaveBeenCalledWith("workspace-42");
    });
    expect(screen.queryByRole("button", { name: "Create project" })).toBeNull();
  });

  it("loads project rows from the dedicated project-list API", async () => {
    mocks.getWorkspaceOverview.mockResolvedValue(workspaceOverviewFor("MEMBER"));
    renderPage();

    expect(await screen.findByText("Website Redesign")).toBeVisible();
    expect(mocks.getProjects).toHaveBeenCalledWith("workspace-42");
    expect(mocks.getWorkspaceOverview).toHaveBeenCalledWith("workspace-42");
  });

  it("keeps project rows visible when the permission lookup fails", async () => {
    mocks.getWorkspaceOverview.mockRejectedValue(new Error("Overview unavailable"));
    renderPage();

    expect(await screen.findByText("Website Redesign")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Create project" })).toBeNull();
  });

  it("shows the empty state when the project-list request fails", async () => {
    mocks.getProjects.mockRejectedValue(new Error("Projects unavailable"));
    mocks.getWorkspaceOverview.mockResolvedValue(workspaceOverviewFor("MEMBER"));
    renderPage();

    expect(await screen.findByText("No projects yet")).toBeVisible();
  });
});
