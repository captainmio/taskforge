import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateProject from "./CreateProject";

const mocks = vi.hoisted(() => ({
  createProject: vi.fn(),
  getWorkspaceMembers: vi.fn(),
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../../services/projects", () => ({
  createProject: mocks.createProject,
}));

vi.mock("../../services/workspaces", () => ({
  getWorkspaceMembers: mocks.getWorkspaceMembers,
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

vi.mock("react-toastify", () => ({
  toast: { success: mocks.toastSuccess },
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
    <MemoryRouter initialEntries={["/workspace/workspace-42/projects/create"]}>
      <Routes>
        <Route
          path="/workspace/:id/projects/create"
          element={<CreateProject />}
        />
      </Routes>
    </MemoryRouter>,
  );

const workspaceMembersFor = (role: "OWNER" | "ADMIN" | "MEMBER") => ({
  success: true as const,
  message: "Workspace overview retrieved",
  data: {
    members: [],
    currentUserRole: role,
    pagination: {
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    },
  },
});

describe("Create Project page", () => {
  beforeEach(() => {
    mocks.createProject.mockReset();
    mocks.navigate.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.getWorkspaceMembers.mockResolvedValue(workspaceMembersFor("OWNER"));
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "renders the project form for a workspace %s",
    async (role) => {
      mocks.getWorkspaceMembers.mockResolvedValueOnce(
        workspaceMembersFor(role),
      );
      renderPage();

      expect(
        await screen.findByRole("heading", {
          name: "Create Project",
          level: 1,
        }),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Back to Projects" }),
      ).toBeVisible();
      expect(screen.getByLabelText(/Project Name/)).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Create Project" }),
      ).toBeVisible();
    },
  );

  it("returns to the current workspace project list from either navigation action", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Create Project", level: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Back to Projects" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mocks.navigate).toHaveBeenNthCalledWith(
      1,
      "/workspace/workspace-42/projects",
    );
    expect(mocks.navigate).toHaveBeenNthCalledWith(
      2,
      "/workspace/workspace-42/projects",
    );
  });

  it("submits the project to the current workspace and returns to its project list", async () => {
    mocks.createProject.mockResolvedValue({
      success: true,
      message: "Project created",
      data: { id: 25 },
    });
    renderPage();

    await screen.findByRole("heading", { name: "Create Project", level: 1 });
    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: "Website Redesign" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Refresh the marketing site." },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "active" },
    });
    fireEvent.change(screen.getByLabelText(/Start Date/), {
      target: { value: "2026-09-01" },
    });
    fireEvent.change(screen.getByLabelText(/Due Date/), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText("Default View"), {
      target: { value: "board" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));

    await waitFor(() => {
      expect(mocks.createProject).toHaveBeenCalledWith("workspace-42", {
        projectName: "Website Redesign",
        description: "Refresh the marketing site.",
        icon: "desktop",
        status: "active",
        startDate: "2026-09-01",
        dueDate: "2026-10-01",
        defaultView: "board",
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Project created");
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/workspace/workspace-42/projects",
    );
  });

  it("redirects a member away from the create-project page", async () => {
    mocks.getWorkspaceMembers.mockResolvedValueOnce(
      workspaceMembersFor("MEMBER"),
    );
    renderPage();

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith(
        "/workspace/workspace-42/projects",
        { replace: true },
      );
    });
    expect(
      screen.queryByRole("heading", { name: "Create Project", level: 1 }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Create Project" })).toBeNull();
  });
});
