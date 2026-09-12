import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LeaveWorkspaceAction from "./LeaveWorkspaceAction";

const mocks = vi.hoisted(() => ({
  leaveWorkspace: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../../services/workspaces", () => ({
  leaveWorkspace: mocks.leaveWorkspace,
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => mocks.navigate };
});

describe("LeaveWorkspaceAction", () => {
  beforeEach(() => {
    mocks.leaveWorkspace.mockResolvedValue({ success: true });
  });

  it("is hidden from workspace owners", () => {
    render(
      <MemoryRouter>
        <LeaveWorkspaceAction workspaceId="42" role="OWNER" />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: /leave workspace/i })).toBeNull();
  });

  it("confirms a member leave request and redirects home", async () => {
    render(
      <MemoryRouter>
        <LeaveWorkspaceAction workspaceId="42" role="MEMBER" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /leave workspace/i }));
    expect(screen.getByRole("dialog", { name: "Leave workspace?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Leave workspace" }));

    await waitFor(() => {
      expect(mocks.leaveWorkspace).toHaveBeenCalledWith("42");
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });
});
