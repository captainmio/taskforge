import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceMember } from "../../types/workspace";
import WorkspaceMembers from "./WorkspaceMembers";

const mocks = vi.hoisted(() => ({
  currentUserId: 1,
  getWorkspaceMembers: vi.fn(),
  navigate: vi.fn(),
  removeWorkspaceMember: vi.fn(),
  showSuccess: vi.fn(),
  updateWorkspaceMemberRole: vi.fn(),
}));

vi.mock("../../services/workspaces", () => ({
  getWorkspaceMembers: mocks.getWorkspaceMembers,
  removeWorkspaceMember: mocks.removeWorkspaceMember,
  updateWorkspaceMemberRole: mocks.updateWorkspaceMemberRole,
}));

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    user: {
      id: mocks.currentUserId,
      email: "current@example.com",
      firstname: "Current",
      lastname: "User",
    },
    workspaces: [{ id: 42, name: "Engineering" }],
  }),
}));

vi.mock("react-toastify", () => ({
  toast: { success: mocks.showSuccess },
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

const members: WorkspaceMember[] = [
  {
    id: 1,
    firstname: "Workspace",
    lastname: "Owner",
    email: "owner@example.com",
    role: "OWNER",
    joinedAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: 2,
    firstname: "Zoe",
    lastname: "Admin",
    email: "zoe@example.com",
    role: "ADMIN",
    joinedAt: "2024-03-15T00:00:00.000Z",
  },
  {
    id: 3,
    firstname: "Ada",
    lastname: "Member",
    email: "ada@example.com",
    role: "MEMBER",
    joinedAt: "2024-02-15T00:00:00.000Z",
  },
];

const memberListResponse = (
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER" = "OWNER",
) => ({
  success: true as const,
  message: "Workspace members retrieved",
  data: {
    members,
    currentUserRole,
    pagination: {
      page: 1,
      pageSize: 20,
      total: members.length,
      totalPages: 1,
    },
  },
});

const renderPage = async () => {
  render(
    <MemoryRouter>
      <WorkspaceMembers />
    </MemoryRouter>,
  );

  await waitFor(() =>
    expect(
      within(screen.getByRole("table", { name: "Workspace members" }))
        .getAllByRole("row"),
    ).toHaveLength(members.length + 1),
  );
};

const tableRows = () =>
  within(screen.getByRole("table", { name: "Workspace members" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.textContent);

const openZoeRoleEditor = () => {
  fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
  return screen.getByRole("dialog", { name: "Update member role" });
};

describe("Workspace members page", () => {
  beforeEach(() => {
    mocks.currentUserId = 1;
    mocks.getWorkspaceMembers.mockResolvedValue(memberListResponse());
    mocks.removeWorkspaceMember.mockResolvedValue({
      success: true,
      message: "Workspace member removed",
      data: { memberId: 2 },
    });
    mocks.updateWorkspaceMemberRole.mockResolvedValue({
      success: true,
      message: "Workspace member role updated",
      data: { ...members[1], role: "MEMBER" },
    });
  });

  it("loads the requested member page and renders its pagination total", async () => {
    await renderPage();

    expect(mocks.getWorkspaceMembers).toHaveBeenCalledWith("42", {
      page: 1,
      pageSize: 20,
    });
    expect(screen.getByText("Workspace Owner (You)")).toBeVisible();
    expect(screen.getByText("Zoe Admin")).toBeVisible();
    expect(screen.getByText("Ada Member")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Workspace Members (3)" }),
    ).toBeVisible();
  });

  it("searches member details and filters the loaded page by role", async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText("Search members"), {
      target: { value: "ada@example.com" },
    });
    expect(screen.getByText("Ada Member")).toBeVisible();
    expect(screen.queryByText("Zoe Admin")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search members"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Filter members by role"), {
      target: { value: "ADMIN" },
    });
    expect(screen.getByText("Zoe Admin")).toBeVisible();
    expect(screen.queryByText("Ada Member")).not.toBeInTheDocument();
  });

  it("sorts one column at a time in ascending and descending order", async () => {
    await renderPage();
    const table = screen.getByRole("table", { name: "Workspace members" });
    const memberHeader = within(table).getByRole("columnheader", {
      name: "Member",
    });
    const joinedHeader = within(table).getByRole("columnheader", {
      name: "Joined at",
    });

    fireEvent.click(within(memberHeader).getByRole("button"));
    expect(tableRows()[0]).toContain("Ada Member");
    expect(memberHeader).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(within(memberHeader).getByRole("button"));
    expect(tableRows()[0]).toContain("Zoe Admin");
    expect(memberHeader).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(within(joinedHeader).getByRole("button"));
    expect(tableRows()[0]).toContain("Workspace Owner");
    expect(joinedHeader).toHaveAttribute("aria-sort", "ascending");
    expect(memberHeader).toHaveAttribute("aria-sort", "none");
  });

  it("hides management actions when the requester is a regular member", async () => {
    mocks.currentUserId = 3;
    mocks.getWorkspaceMembers.mockResolvedValue(memberListResponse("MEMBER"));
    await renderPage();

    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove" }),
    ).not.toBeInTheDocument();
  });

  it("prevents an admin from editing their own role while allowing edits to other members", async () => {
    mocks.currentUserId = 2;
    mocks.getWorkspaceMembers.mockResolvedValue(memberListResponse("ADMIN"));
    await renderPage();

    const adminRow = screen.getByText("Zoe Admin (You)").closest("tr");
    const memberRow = screen.getByText("Ada Member").closest("tr");

    expect(adminRow).not.toBeNull();
    expect(memberRow).not.toBeNull();
    expect(
      within(adminRow as HTMLTableRowElement).queryByRole("button", {
        name: "Edit",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(adminRow as HTMLTableRowElement).getByRole("button", {
        name: "Remove",
      }),
    ).toBeVisible();
    expect(
      within(memberRow as HTMLTableRowElement).getByRole("button", {
        name: "Edit",
      }),
    ).toBeVisible();
  });

  it("updates a member role, reports success, and refreshes the member list", async () => {
    await renderPage();
    const editDialog = openZoeRoleEditor();
    const roleSelect = within(editDialog).getByLabelText("Workspace role");

    expect(
      within(roleSelect).queryByRole("option", { name: "Owner" }),
    ).toBeNull();
    expect(
      within(editDialog).getByRole("button", { name: "Update Role" }),
    ).toBeDisabled();

    fireEvent.change(roleSelect, { target: { value: "MEMBER" } });
    fireEvent.click(
      within(editDialog).getByRole("button", { name: "Update Role" }),
    );

    await waitFor(() => {
      expect(mocks.updateWorkspaceMemberRole).toHaveBeenCalledWith("42", 2, {
        role: "MEMBER",
      });
      expect(mocks.getWorkspaceMembers).toHaveBeenCalledTimes(2);
    });
    expect(mocks.showSuccess).toHaveBeenCalledWith(
      "Workspace member role updated",
    );
    expect(
      screen.queryByRole("dialog", { name: "Update member role" }),
    ).not.toBeInTheDocument();
  });

  it("locks the role editor while an update is pending", async () => {
    let finishUpdate:
      | ((value: {
          success: true;
          message: string;
          data: WorkspaceMember;
        }) => void)
      | undefined;
    mocks.updateWorkspaceMemberRole.mockReturnValue(
      new Promise((resolve) => {
        finishUpdate = resolve;
      }),
    );
    await renderPage();
    const editDialog = openZoeRoleEditor();
    const roleSelect = within(editDialog).getByLabelText("Workspace role");

    fireEvent.change(roleSelect, { target: { value: "MEMBER" } });
    fireEvent.click(
      within(editDialog).getByRole("button", { name: "Update Role" }),
    );

    expect(
      await within(editDialog).findByRole("button", {
        name: "Updating Role...",
      }),
    ).toBeDisabled();
    expect(roleSelect).toBeDisabled();
    expect(
      within(editDialog).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled();

    await act(async () => {
      finishUpdate?.({
        success: true,
        message: "Workspace member role updated",
        data: { ...members[1], role: "MEMBER" },
      });
    });
  });

  it("keeps the role editor open after failure and allows a retry", async () => {
    mocks.updateWorkspaceMemberRole.mockRejectedValueOnce(
      new Error("Role update conflict"),
    );
    await renderPage();
    const editDialog = openZoeRoleEditor();
    fireEvent.change(within(editDialog).getByLabelText("Workspace role"), {
      target: { value: "MEMBER" },
    });

    fireEvent.click(
      within(editDialog).getByRole("button", { name: "Update Role" }),
    );

    await waitFor(() => {
      expect(mocks.updateWorkspaceMemberRole).toHaveBeenCalledTimes(1);
      expect(
        within(editDialog).getByRole("button", { name: "Update Role" }),
      ).toBeEnabled();
    });
    expect(editDialog).toBeVisible();
    expect(mocks.showSuccess).not.toHaveBeenCalled();

    fireEvent.click(
      within(editDialog).getByRole("button", { name: "Update Role" }),
    );
    await waitFor(() => {
      expect(mocks.updateWorkspaceMemberRole).toHaveBeenCalledTimes(2);
      expect(mocks.showSuccess).toHaveBeenCalledWith(
        "Workspace member role updated",
      );
    });
  });

  it("removes a member through the service and refreshes the list", async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    const removeDialog = screen.getByRole("dialog", {
      name: "Remove workspace member",
    });

    fireEvent.click(
      within(removeDialog).getByRole("button", { name: "Remove Member" }),
    );

    await waitFor(() => {
      expect(mocks.removeWorkspaceMember).toHaveBeenCalledWith("42", 2);
      expect(mocks.getWorkspaceMembers).toHaveBeenCalledTimes(2);
    });
    expect(mocks.showSuccess).toHaveBeenCalledWith("Workspace member removed");
  });

  it("returns to the landing page when member loading fails", async () => {
    mocks.getWorkspaceMembers.mockRejectedValue(new Error("Not authorized"));
    render(
      <MemoryRouter>
        <WorkspaceMembers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });
});
