import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InviteMembers from "./InviteMembers";

const mocks = vi.hoisted(() => ({
  getWorkspaceOverview: vi.fn(),
  generateWorkspaceInviteLink: vi.fn(),
  inviteWorkspaceMembers: vi.fn(),
  navigate: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  writeClipboard: vi.fn(),
}));

const workspaceOverviewResponse = {
  success: true as const,
  message: "Workspace overview retrieved",
  data: {
    id: 42,
    displayName: "Engineering Team",
    description: "Builds and maintains the product.",
    icon: "code" as const,
    createdAt: "2026-08-18T00:00:00.000Z",
    members: [],
  },
};

vi.mock("../../services/workspaces", () => ({
  getWorkspaceOverview: mocks.getWorkspaceOverview,
}));

vi.mock("../../services/invitations", () => ({
  generateWorkspaceInviteLink: mocks.generateWorkspaceInviteLink,
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
  toast: { error: mocks.showError, success: mocks.showSuccess },
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
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: mocks.writeClipboard },
    });
    mocks.getWorkspaceOverview.mockResolvedValue(workspaceOverviewResponse);
    mocks.inviteWorkspaceMembers.mockResolvedValue({
      success: true,
      message: "Workspace invitations queued",
      data: { invitationCount: 1 },
    });
    mocks.generateWorkspaceInviteLink.mockResolvedValue({
      success: true,
      message: "Workspace invitation link generated",
      data: {
        invitationLink:
          "http://localhost:5173/invitations/accept?token=shared-token&type=link",
        expiresAt: "2026-08-29T00:00:00.000Z",
      },
    });
    mocks.writeClipboard.mockResolvedValue(undefined);
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
      authorize?.(workspaceOverviewResponse);
    });

    expect(
      await screen.findByRole("heading", { name: "Invite Members" }),
    ).toBeVisible();
  });

  it("starts with invitation submission disabled", async () => {
    await renderAuthorizedPage();

    expect(
      screen.getByText(
        "Invite people to join Engineering Team and start collaborating.",
      ),
    ).toBeVisible();
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

  it("shows loading and then displays the generated invitation link", async () => {
    let finishRequest:
      | ((value: {
          success: true;
          message: string;
          data: { invitationLink: string; expiresAt: string };
        }) => void)
      | undefined;
    mocks.generateWorkspaceInviteLink.mockReturnValue(
      new Promise((resolve) => {
        finishRequest = resolve;
      }),
    );
    await renderAuthorizedPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Generate invite link" }),
    );

    expect(
      await screen.findByRole("button", { name: "Generating link..." }),
    ).toBeDisabled();
    expect(mocks.generateWorkspaceInviteLink).toHaveBeenCalledWith("42");

    await act(async () => {
      finishRequest?.({
        success: true,
        message: "Workspace invitation link generated",
        data: {
          invitationLink:
            "http://localhost:5173/invitations/accept?token=shared-token&type=link",
          expiresAt: "2026-08-29T00:00:00.000Z",
        },
      });
    });

    expect(screen.getByLabelText("Invitation link")).toHaveValue(
      "http://localhost:5173/invitations/accept?token=shared-token&type=link",
    );
    expect(
      screen.getByRole("button", { name: "Generate new link" }),
    ).toBeEnabled();
    expect(mocks.showSuccess).toHaveBeenCalledWith(
      "Workspace invitation link generated",
    );
  });

  it("shows an inline error and keeps generation available after failure", async () => {
    mocks.generateWorkspaceInviteLink.mockRejectedValue(
      new Error("Database unavailable"),
    );
    await renderAuthorizedPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Generate invite link" }),
    );

    expect(
      await screen.findByRole("alert", {
        name: "",
      }),
    ).toHaveTextContent(
      "Unable to generate an invitation link. Please try again.",
    );
    expect(
      screen.getByRole("button", { name: "Generate invite link" }),
    ).toBeEnabled();
    expect(screen.queryByLabelText("Invitation link")).not.toBeInTheDocument();
  });

  it("replaces the displayed value when a new link is generated", async () => {
    mocks.generateWorkspaceInviteLink
      .mockResolvedValueOnce({
        success: true,
        message: "Workspace invitation link generated",
        data: {
          invitationLink: "https://example.com/first-link",
          expiresAt: "2026-08-29T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        success: true,
        message: "Workspace invitation link generated",
        data: {
          invitationLink: "https://example.com/replacement-link",
          expiresAt: "2026-08-30T00:00:00.000Z",
        },
      });
    await renderAuthorizedPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Generate invite link" }),
    );
    expect(await screen.findByLabelText("Invitation link")).toHaveValue(
      "https://example.com/first-link",
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate new link" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Invitation link")).toHaveValue(
        "https://example.com/replacement-link",
      );
    });
  });

  it("shows Copied temporarily without displaying a success toast", async () => {
    await renderAuthorizedPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Generate invite link" }),
    );
    await screen.findByLabelText("Invitation link");
    mocks.showSuccess.mockClear();
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await act(async () => Promise.resolve());

    expect(mocks.writeClipboard).toHaveBeenCalledWith(
      "http://localhost:5173/invitations/accept?token=shared-token&type=link",
    );
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(mocks.showSuccess).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByRole("button", { name: "Copy link" })).toBeVisible();
    vi.useRealTimers();
  });

  it("keeps the original copy label and shows an error when copying fails", async () => {
    mocks.writeClipboard.mockRejectedValue(new Error("Clipboard unavailable"));
    await renderAuthorizedPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Generate invite link" }),
    );
    await screen.findByLabelText("Invitation link");

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => {
      expect(mocks.showError).toHaveBeenCalledWith(
        "Unable to copy the invitation link",
      );
    });
    expect(screen.getByRole("button", { name: "Copy link" })).toBeVisible();
  });
});
