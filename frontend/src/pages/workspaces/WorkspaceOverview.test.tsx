import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkspaceOverview from "./WorkspaceOverview";

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
      email: "owner@example.com",
      firstname: "Workspace",
      lastname: "Owner",
    },
    workspaces: [{ id: 42, name: "Engineering" }],
  }),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>(
    "react-router",
  );

  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => ({ id: "42" }),
  };
});

describe("Workspace overview", () => {
  beforeEach(() => {
    mocks.getWorkspaceOverview.mockResolvedValue({
      success: true,
      message: "Workspace overview retrieved",
      data: {
        id: 42,
        displayName: "Product Launch Team",
        description: "Coordinates the upcoming product launch.",
        icon: "launch",
        createdAt: "2026-08-18T12:00:00.000Z",
        members: [
          {
            id: 1,
            firstname: "Workspace",
            lastname: "Owner",
            email: "owner@example.com",
            role: "OWNER",
            joinedAt: "2026-08-18T12:00:00.000Z",
          },
        ],
      },
    });
  });

  it("renders the selected workspace metadata and member preview", async () => {
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
    expect(screen.getByText("Workspace Owner (You)")).toBeVisible();
    expect(screen.getByText("owner@example.com")).toBeVisible();
  });

  it("links the members preview to the complete member list", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <WorkspaceOverview />
      </MemoryRouter>,
    );

    const link = await screen.findByRole("link", { name: "View members" });
    expect(link).toHaveAttribute("href", "/workspace/42/members");

    fireEvent.click(link);
    expect(consoleLog).toHaveBeenCalledWith("Workspace member list opened", {
      workspaceId: "42",
    });
  });
});
