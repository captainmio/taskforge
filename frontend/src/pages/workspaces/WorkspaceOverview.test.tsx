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
    workspaceIds: [42],
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
      message: "Workspace members retrieved",
      data: [
        {
          id: 1,
          firstname: "Workspace",
          lastname: "Owner",
          email: "owner@example.com",
          role: "OWNER",
          joinedAt: "2024-01-15T00:00:00.000Z",
        },
      ],
    });
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
