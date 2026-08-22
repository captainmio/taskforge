import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateProject from "./CreateProject";

const mocks = vi.hoisted(() => ({
  getWorkspaceOverview: vi.fn(),
  navigate: vi.fn(),
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
    <MemoryRouter initialEntries={["/workspace/workspace-42/projects/create"]}>
      <Routes>
        <Route path="/workspace/:id/projects/create" element={<CreateProject />} />
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

describe("Create Project page", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.getWorkspaceOverview.mockResolvedValue(workspaceOverviewFor("OWNER"));
  });

  it.each(["OWNER", "ADMIN"] as const)(
    "renders the project form for a workspace %s",
    async (role) => {
      mocks.getWorkspaceOverview.mockResolvedValueOnce(workspaceOverviewFor(role));
    renderPage();

      expect(await screen.findByRole("heading", { name: "Create Project", level: 1 })).toBeVisible();
      expect(screen.getByRole("button", { name: "Back to Projects" })).toBeVisible();
      expect(screen.getByLabelText(/Project Name/)).toBeVisible();
      expect(screen.getByRole("button", { name: "Create Project" })).toBeVisible();
    },
  );

  it("returns to the current workspace project list from either navigation action", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Create Project", level: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Back to Projects" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mocks.navigate).toHaveBeenNthCalledWith(1, "/workspace/workspace-42/projects");
    expect(mocks.navigate).toHaveBeenNthCalledWith(2, "/workspace/workspace-42/projects");
  });

  it("redirects a member away from the create-project page", async () => {
    mocks.getWorkspaceOverview.mockResolvedValueOnce(workspaceOverviewFor("MEMBER"));
    renderPage();

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith(
        "/workspace/workspace-42/projects",
        { replace: true },
      );
    });
    expect(screen.queryByRole("heading", { name: "Create Project", level: 1 })).toBeNull();
    expect(screen.queryByRole("button", { name: "Create Project" })).toBeNull();
  });
});
