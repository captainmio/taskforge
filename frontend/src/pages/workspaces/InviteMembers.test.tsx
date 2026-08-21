import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InviteMembers from "./InviteMembers";

const mocks = vi.hoisted(() => ({
  getWorkspaceOverview: vi.fn(),
  inviteWorkspaceMembers: vi.fn(),
  navigate: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("../../services/workspaces", () => ({
  getWorkspaceOverview: mocks.getWorkspaceOverview,
}));

vi.mock("../../services/invitations", () => ({
  inviteWorkspaceMembers: mocks.inviteWorkspaceMembers,
}));

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    user: {
      id: 7,
      email: "owner@example.com",
      firstname: "Workspace",
      lastname: "Owner",
    },
    workspaces: [{ id: 42, name: "Engineering" }],
  }),
}));

vi.mock("react-toastify", () => ({
  toast: { success: mocks.showSuccess },
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

const renderPage = () =>
  render(
    <MemoryRouter>
      <InviteMembers />
    </MemoryRouter>,
  );

const renderAuthorizedPage = async () => {
  renderPage();
  await screen.findByRole("heading", { name: "Invite Members" });
};

const addInvitation = async (
  email: string,
  role: "ADMIN" | "MEMBER" = "MEMBER",
) => {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Workspace role"), {
    target: { value: role },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  await screen.findByText(email.trim().toLowerCase());
};

describe("Invite members page", () => {
  beforeEach(() => {
    mocks.getWorkspaceOverview.mockResolvedValue({
      success: true,
      message: "Workspace members retrieved",
      data: [],
    });
    mocks.inviteWorkspaceMembers.mockResolvedValue({
      success: true,
      message: "Workspace invitations queued",
      data: { invitationCount: 1 },
    });
  });

  it("waits for workspace authorization before showing the page", async () => {
    let authorize: ((value: unknown) => void) | undefined;
    mocks.getWorkspaceOverview.mockReturnValue(
      new Promise((resolve) => {
        authorize = resolve;
      }),
    );

    renderPage();

    expect(
      screen.queryByRole("heading", { name: "Invite Members" }),
    ).not.toBeInTheDocument();
    expect(mocks.getWorkspaceOverview).toHaveBeenCalledWith("42");

    await act(async () => {
      authorize?.({
        success: true,
        message: "Workspace members retrieved",
        data: [],
      });
    });

    expect(
      await screen.findByRole("heading", { name: "Invite Members" }),
    ).toBeVisible();
  });

  it("starts with invitation submission disabled", async () => {
    await renderAuthorizedPage();

    expect(
      screen.getByRole("button", { name: "Send Invitations" }),
    ).toBeDisabled();
  });

  it("normalizes added emails and rejects a duplicate email", async () => {
    await renderAuthorizedPage();
    await addInvitation(" MEMBER@Example.COM ", "ADMIN");

    expect(screen.getByText("member@example.com")).toBeVisible();
    expect(screen.getByLabelText("Role for member@example.com: Admin")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "MEMBER@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("This email address is already in the invitation list."),
    ).toBeVisible();
    expect(screen.getAllByText("member@example.com")).toHaveLength(1);
  });

  it("removes a prepared invitation and disables submission again", async () => {
    await renderAuthorizedPage();
    await addInvitation("member@example.com");

    fireEvent.click(
      screen.getByRole("button", { name: "Remove member@example.com" }),
    );

    expect(screen.queryByText("member@example.com")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send Invitations" }),
    ).toBeDisabled();
  });

  it("submits the prepared list, shows the backend message, and returns to the overview", async () => {
    await renderAuthorizedPage();
    await addInvitation(" ADMIN@Example.COM ", "ADMIN");
    await addInvitation("member@example.com");

    fireEvent.click(screen.getByRole("button", { name: "Send Invitations" }));

    await waitFor(() => {
      expect(mocks.inviteWorkspaceMembers).toHaveBeenCalledWith("42", {
        invitations: [
          { email: "admin@example.com", role: "ADMIN" },
          { email: "member@example.com", role: "MEMBER" },
        ],
      });
    });
    expect(mocks.showSuccess).toHaveBeenCalledWith(
      "Workspace invitations queued",
    );
    expect(mocks.navigate).toHaveBeenCalledWith("/workspace/42");
  });

  it("disables list changes while invitation submission is pending", async () => {
    let finishRequest:
      | ((value: {
          success: true;
          message: string;
          data: { invitationCount: number };
        }) => void)
      | undefined;
    mocks.inviteWorkspaceMembers.mockReturnValue(
      new Promise((resolve) => {
        finishRequest = resolve;
      }),
    );
    await renderAuthorizedPage();
    await addInvitation("member@example.com");

    fireEvent.click(screen.getByRole("button", { name: "Send Invitations" }));

    expect(
      await screen.findByRole("button", { name: "Sending Invitations..." }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Email address")).toBeDisabled();
    expect(screen.getByLabelText("Workspace role")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Remove member@example.com" }),
    ).toBeDisabled();

    await act(async () => {
      finishRequest?.({
        success: true,
        message: "Workspace invitations queued",
        data: { invitationCount: 1 },
      });
    });
  });

  it("keeps the prepared list and stays on the page when submission fails", async () => {
    mocks.inviteWorkspaceMembers.mockRejectedValue(
      new Error("Invitation conflict"),
    );
    await renderAuthorizedPage();
    await addInvitation("member@example.com");

    fireEvent.click(screen.getByRole("button", { name: "Send Invitations" }));

    await waitFor(() => {
      expect(mocks.inviteWorkspaceMembers).toHaveBeenCalledOnce();
      expect(
        screen.getByRole("button", { name: "Send Invitations" }),
      ).toBeEnabled();
    });
    expect(screen.getByText("member@example.com")).toBeVisible();
    expect(mocks.showSuccess).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
