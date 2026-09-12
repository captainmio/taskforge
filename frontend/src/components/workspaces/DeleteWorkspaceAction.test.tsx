import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeleteWorkspaceAction from "./DeleteWorkspaceAction";

const mocks = vi.hoisted(() => ({
  deleteWorkspace: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../../services/workspaces", () => ({
  deleteWorkspace: mocks.deleteWorkspace,
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => mocks.navigate };
});

describe("DeleteWorkspaceAction", () => {
  beforeEach(() => {
    mocks.deleteWorkspace.mockResolvedValue({ success: true });
  });

  it("is visible only to the workspace owner", () => {
    render(
      <MemoryRouter>
        <DeleteWorkspaceAction workspaceId="42" workspaceName="Engineering Team" role="ADMIN" />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: /delete workspace/i })).toBeNull();
  });

  it("requires an exact workspace name before permanently deleting", async () => {
    render(
      <MemoryRouter>
        <DeleteWorkspaceAction workspaceId="42" workspaceName="Engineering Team" role="OWNER" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /delete workspace/i }));
    expect(screen.getByText(/cannot be undone/i)).toBeVisible();
    const confirmButton = screen.getByRole("button", { name: "Delete workspace" });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/type engineering team to confirm/i), {
      target: { value: "Engineering Team" },
    });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mocks.deleteWorkspace).toHaveBeenCalledWith("42", "Engineering Team");
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });
});
