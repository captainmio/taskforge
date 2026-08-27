import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditProject from "./EditProject";

const mocks = vi.hoisted(() => ({
  getProjectById: vi.fn(),
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("../../services/projects", () => ({
  getProjectById: mocks.getProjectById,
  updateProject: mocks.updateProject,
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

const project = {
  id: 25,
  name: "Website Redesign",
  description: "Refresh the marketing site.",
  icon: "desktop" as const,
  status: "on_hold" as const,
  startDate: "2026-09-01T00:00:00.000Z",
  dueDate: "2026-10-01T00:00:00.000Z",
  defaultView: "board" as const,
  createdAt: "2026-08-22T00:00:00.000Z",
};

const projectResponseFor = (currentUserRole: "OWNER" | "ADMIN" | "MEMBER") => ({
  success: true as const,
  message: "Project retrieved",
  data: { project, currentUserRole },
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/workspace/workspace-42/projects/25/edit"]}>
      <Routes>
        <Route
          path="/workspace/:id/projects/:projectId/edit"
          element={<EditProject />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("Edit Project page", () => {
  beforeEach(() => {
    mocks.getProjectById.mockReset();
    mocks.navigate.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.updateProject.mockReset();
    mocks.getProjectById.mockResolvedValue(projectResponseFor("OWNER"));
  });

  it("loads and prefills the selected project for an owner", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Edit Project", level: 1 }),
    ).toBeVisible();
    expect(screen.getByLabelText(/Project Name/)).toHaveValue(
      "Website Redesign",
    );
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Refresh the marketing site.",
    );
    expect(screen.getByLabelText("Status")).toHaveValue("on-hold");
    expect(screen.getByLabelText(/Start Date/)).toHaveValue("2026-09-01");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeVisible();
    expect(mocks.getProjectById).toHaveBeenCalledWith("workspace-42", 25);
  });

  it("updates the selected project and returns to the project list", async () => {
    mocks.updateProject.mockResolvedValue({
      success: true,
      message: "Project updated",
      data: { id: 25 },
    });
    renderPage();

    await screen.findByRole("heading", { name: "Edit Project", level: 1 });
    fireEvent.change(screen.getByLabelText(/Project Name/), {
      target: { value: "Website Refresh" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mocks.updateProject).toHaveBeenCalledWith("workspace-42", 25, {
        projectName: "Website Refresh",
        description: "Refresh the marketing site.",
        icon: "desktop",
        status: "on-hold",
        startDate: "2026-09-01",
        dueDate: "2026-10-01",
        defaultView: "board",
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Project updated");
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/workspace/workspace-42/projects",
    );
  });

  it("redirects members and missing projects to the project list", async () => {
    mocks.getProjectById.mockResolvedValueOnce(projectResponseFor("MEMBER"));
    renderPage();

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith(
        "/workspace/workspace-42/projects",
        { replace: true },
      );
    });

    mocks.navigate.mockReset();
    mocks.getProjectById.mockRejectedValueOnce(new Error("Not found"));
    renderPage();

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith(
        "/workspace/workspace-42/projects",
        { replace: true },
      );
    });
  });
});
