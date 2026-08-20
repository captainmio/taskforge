import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceMember } from "../../types/workspace";
import WorkspaceMembers from "./WorkspaceMembers";

const mocks = vi.hoisted(() => ({
  currentUserId: 1,
  getWorkspaceOverview: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../../services/workspaces", () => ({
  getWorkspaceOverview: mocks.getWorkspaceOverview,
}));

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    user: {
      id: mocks.currentUserId,
      email: "current@example.com",
      firstname: "Current",
      lastname: "User",
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

const renderPage = async () => {
  render(
    <MemoryRouter>
      <WorkspaceMembers />
    </MemoryRouter>,
  );

  await screen.findByRole("heading", { name: "Member List" });
};

const tableRows = () =>
  within(screen.getByRole("table", { name: "Workspace members" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.textContent);

describe("Workspace members page", () => {
  beforeEach(() => {
    mocks.currentUserId = 1;
    mocks.getWorkspaceOverview.mockResolvedValue({
      success: true,
      message: "Workspace members retrieved",
      data: members,
    });
  });

  it("loads every member including the owner and renders joined dates in their own column", async () => {
    await renderPage();

    expect(mocks.getWorkspaceOverview).toHaveBeenCalledWith("42");
    expect(screen.getByText("Workspace Owner (You)")).toBeVisible();
    expect(screen.getByText("Zoe Admin")).toBeVisible();
    expect(screen.getByText("Ada Member")).toBeVisible();

    const table = screen.getByRole("table", { name: "Workspace members" });
    expect(
      within(table).getByRole("columnheader", { name: "Joined at" }),
    ).toBeVisible();
    expect(
      within(table).getByText(
        new Date(members[0].joinedAt).toLocaleDateString(),
      ),
    ).toBeVisible();
  });

  it("searches by member details and filters by role", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await renderPage();

    fireEvent.change(screen.getByLabelText("Search members"), {
      target: { value: "ada@example.com" },
    });
    expect(screen.getByText("Ada Member")).toBeVisible();
    expect(screen.queryByText("Zoe Admin")).not.toBeInTheDocument();
    expect(consoleLog).toHaveBeenCalledWith("Workspace member search changed", {
      workspaceId: "42",
      query: "ada@example.com",
    });

    fireEvent.change(screen.getByLabelText("Search members"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Filter members by role"), {
      target: { value: "ADMIN" },
    });
    expect(screen.getByText("Zoe Admin")).toBeVisible();
    expect(screen.queryByText("Ada Member")).not.toBeInTheDocument();
    expect(consoleLog).toHaveBeenCalledWith(
      "Workspace member role filter changed",
      { workspaceId: "42", role: "ADMIN" },
    );
  });

  it("sorts one column at a time in ascending and descending order", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
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
    expect(consoleLog).toHaveBeenLastCalledWith(
      "Workspace member sorting changed",
      { workspaceId: "42", column: "joinedAt", direction: "ascending" },
    );
  });

  it("hides management actions from regular members", async () => {
    mocks.currentUserId = 3;
    await renderPage();

    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove" }),
    ).not.toBeInTheDocument();
  });

  it("lets an owner prepare role updates and member removal", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await renderPage();

    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    const editDialog = screen.getByRole("dialog", { name: "Update member role" });
    const roleSelect = within(editDialog).getByLabelText("Workspace role");
    expect(within(roleSelect).queryByRole("option", { name: "Owner" })).toBeNull();
    expect(within(roleSelect).getByRole("option", { name: "Admin" })).toBeVisible();
    expect(within(roleSelect).getByRole("option", { name: "Member" })).toBeVisible();

    fireEvent.change(roleSelect, { target: { value: "MEMBER" } });
    fireEvent.click(within(editDialog).getByRole("button", { name: "Update Role" }));
    expect(consoleLog).toHaveBeenCalledWith(
      "Workspace member role update requested",
      {
        workspaceId: "42",
        memberId: 2,
        previousRole: "ADMIN",
        nextRole: "MEMBER",
      },
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    const removeDialog = screen.getByRole("dialog", {
      name: "Remove workspace member",
    });
    expect(within(removeDialog).getByText(/Zoe Admin/)).toBeVisible();
    fireEvent.click(
      within(removeDialog).getByRole("button", { name: "Remove Member" }),
    );
    expect(consoleLog).toHaveBeenCalledWith(
      "Workspace member removal requested",
      { workspaceId: "42", memberId: 2, email: "zoe@example.com" },
    );
  });

  it("returns to the landing page when member loading fails", async () => {
    mocks.getWorkspaceOverview.mockRejectedValue(new Error("Not authorized"));
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
