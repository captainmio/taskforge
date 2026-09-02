import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkspaceOverview from "./WorkspaceOverview";

const mocks = vi.hoisted(() => ({
  getWorkspaceHistory: vi.fn(),
  getWorkspaceOverview: vi.fn(),
  navigate: vi.fn(),
}));

const workspaceOverview = {
  id: 42,
  displayName: "Product Launch Team",
  description: "Coordinates the upcoming product launch.",
  icon: "launch" as const,
  createdAt: "2026-08-18T12:00:00.000Z",
  memberCount: 1,
  recentUpdates: [
    {
      id: 3,
      action: "updated",
      changes: { status: { from: "todo", to: "done" } },
      createdAt: "2026-09-02T02:26:00.000Z",
      actor: {
        id: 1,
        firstname: "Workspace",
        lastname: "Owner",
        email: "owner@example.com",
      },
      task: {
        id: 101,
        title: "Ship workspace history",
        project: { id: 25, name: "Website Redesign" },
      },
    },
    {
      id: 2,
      action: "updated",
      changes: {},
      createdAt: "2026-09-02T02:25:00.000Z",
      actor: {
        id: 1,
        firstname: "Workspace",
        lastname: "Owner",
        email: "owner@example.com",
      },
      task: {
        id: 100,
        title: "Ignore empty update",
        project: { id: 25, name: "Website Redesign" },
      },
    },
  ],
  projects: [
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
      taskCount: 8,
      completedTaskCount: 3,
    },
    {
      id: 26,
      name: "Mobile App",
      description: "Build the mobile application.",
      icon: "mobile" as const,
      status: "active" as const,
      startDate: null,
      dueDate: null,
      defaultView: "list" as const,
      createdAt: "2026-08-23T00:00:00.000Z",
      taskCount: 0,
      completedTaskCount: 0,
    },
  ],
};

vi.mock("../../services/workspaces", () => ({
  getWorkspaceHistory: mocks.getWorkspaceHistory,
  getWorkspaceOverview: mocks.getWorkspaceOverview,
}));

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    user: {
      id: 1,
      email: "owner@example.com",
      firstname: "Workspace",
      lastname: "Owner",
    },
    workspaces: [{ id: 42, name: "Engineering" }],
  }),
}));

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => ({ id: "42" }),
  };
});

describe("Workspace overview", () => {
  beforeEach(() => {
    mocks.getWorkspaceHistory.mockResolvedValue({
      success: true,
      message: "Workspace history retrieved",
      data: { history: [], nextCursor: null },
    });
    mocks.getWorkspaceOverview.mockResolvedValue({
      success: true,
      message: "Workspace overview retrieved",
      data: workspaceOverview,
    });
  });

  it("renders completed task totals and progress for every project", async () => {
    render(
      <MemoryRouter>
        <WorkspaceOverview />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Product Launch Team" }),
    ).toBeVisible();
    expect(
      screen.getByText("Coordinates the upcoming product launch."),
    ).toBeVisible();
    expect(screen.getByText("PL")).toBeVisible();
    expect(screen.getByText(/Created on .*2026/)).toBeVisible();
    const membersStatLabel = screen
      .getAllByText("Members")
      .find((element) => element.tagName === "P");
    expect(membersStatLabel).toBeDefined();
    expect(membersStatLabel?.parentElement).toHaveTextContent("1");
    const projectsStatLabel = screen
      .getAllByText("Projects")
      .find((element) => element.tagName === "P");
    expect(projectsStatLabel?.parentElement).toHaveTextContent("2");
    expect(screen.getByText("Website Redesign")).toBeVisible();
    expect(screen.getByText("3 Completed")).toBeVisible();
    expect(
      screen.getByRole("progressbar", {
        name: "Website Redesign completion",
      }),
    ).toHaveAttribute("aria-valuenow", "38");
    expect(screen.getByText("Mobile App")).toBeVisible();
    expect(screen.getByText("0 Completed")).toBeVisible();
    expect(screen.getByText("No tasks yet")).toBeVisible();
    expect(
      screen.queryByText("Refresh the marketing site."),
    ).not.toBeInTheDocument();
  });

  it("opens the recent updates dialog", async () => {
    mocks.getWorkspaceHistory
      .mockResolvedValueOnce({
        success: true,
        message: "Workspace history retrieved",
        data: {
          history: [
            {
              id: 18,
              action: "updated",
              changes: { title: { from: "Draft", to: "Published" } },
              createdAt: "2026-09-02T02:26:00.000Z",
              actor: {
                id: 1,
                firstname: "Workspace",
                lastname: "Owner",
                email: "owner@example.com",
              },
              task: {
                id: 101,
                title: "Ship workspace history",
                project: { id: 25, name: "Website Redesign" },
              },
            },
          ],
          nextCursor: 18,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        message: "Workspace history retrieved",
        data: {
          history: [
            {
              id: 17,
              action: "created",
              changes: { snapshot: { title: "Initial task" } },
              createdAt: "2026-09-02T02:25:00.000Z",
              actor: {
                id: 1,
                firstname: "Workspace",
                lastname: "Owner",
                email: "owner@example.com",
              },
              task: {
                id: 100,
                title: "Initial task",
                project: { id: 25, name: "Website Redesign" },
              },
            },
          ],
          nextCursor: null,
        },
      });
    render(
      <MemoryRouter>
        <WorkspaceOverview />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "View All" }));

    expect(await screen.findByRole("dialog", { name: "Recent Updates" })).toBeVisible();
    expect(mocks.getWorkspaceHistory).toHaveBeenCalledWith("42", undefined);
    expect(await screen.findByText("Published")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findAllByText("Initial task")).toHaveLength(2);
    expect(mocks.getWorkspaceHistory).toHaveBeenLastCalledWith("42", 18);
  });

  it("renders valid overview updates and ignores empty history records", async () => {
    render(
      <MemoryRouter>
        <WorkspaceOverview />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Status:")).toBeVisible();
    expect(screen.getByText("Ship workspace history")).toBeVisible();
    expect(screen.queryByText("Ignore empty update")).not.toBeInTheDocument();
  });

  it("shows an empty state when the workspace has no projects", async () => {
    mocks.getWorkspaceOverview.mockResolvedValueOnce({
      success: true,
      message: "Workspace overview retrieved",
      data: { ...workspaceOverview, projects: [] },
    });

    render(
      <MemoryRouter>
        <WorkspaceOverview />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No projects yet.")).toBeVisible();
    expect(screen.queryByText("Website Redesign")).toBeNull();
  });
});
