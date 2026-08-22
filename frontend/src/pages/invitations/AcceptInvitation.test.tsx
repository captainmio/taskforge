import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AcceptInvitation from "./AcceptInvitation";

const mocks = vi.hoisted(() => ({
  acceptWorkspaceInvitation: vi.fn(),
  acceptWorkspaceInviteLink: vi.fn(),
  isAxiosError: vi.fn(),
}));

vi.mock("../../services/invitations", () => ({
  acceptWorkspaceInvitation: mocks.acceptWorkspaceInvitation,
  acceptWorkspaceInviteLink: mocks.acceptWorkspaceInviteLink,
}));

vi.mock("axios", () => ({
  default: { isAxiosError: mocks.isAxiosError },
}));

const acceptedResponse = {
  success: true,
  message: "Invitation accepted",
  workspace: { id: 42, displayName: "Engineering Team" },
};

const renderPage = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AcceptInvitation />
    </MemoryRouter>,
  );

describe("Accept invitation page", () => {
  beforeEach(() => {
    mocks.acceptWorkspaceInvitation.mockResolvedValue(acceptedResponse);
    mocks.acceptWorkspaceInviteLink.mockResolvedValue(acceptedResponse);
    mocks.isAxiosError.mockReturnValue(false);
  });

  it("uses the shared-link endpoint when the URL has type=link", async () => {
    renderPage("/invitations/accept?token=shared-token&type=link");

    fireEvent.click(
      screen.getByRole("button", { name: "Accept invitation" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Invitation accepted" }),
    ).toBeVisible();
    expect(mocks.acceptWorkspaceInviteLink).toHaveBeenCalledWith(
      "shared-token",
    );
    expect(mocks.acceptWorkspaceInvitation).not.toHaveBeenCalled();
    expect(screen.getByText(/You have joined Engineering Team/)).toBeVisible();
  });

  it("keeps email invitations on the existing acceptance endpoint", async () => {
    renderPage("/invitations/accept?token=email-token");

    fireEvent.click(
      screen.getByRole("button", { name: "Accept invitation" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Invitation accepted" }),
    ).toBeVisible();
    expect(mocks.acceptWorkspaceInvitation).toHaveBeenCalledWith("email-token");
    expect(mocks.acceptWorkspaceInviteLink).not.toHaveBeenCalled();
  });

  it("preserves the shared-link marker through sign-in and registration", async () => {
    mocks.isAxiosError.mockReturnValue(true);
    mocks.acceptWorkspaceInviteLink.mockRejectedValue({
      response: { status: 401, data: { error: "Authentication required" } },
    });
    renderPage("/invitations/accept?token=shared-token&type=link");

    fireEvent.click(
      screen.getByRole("button", { name: "Accept invitation" }),
    );

    expect(
      await screen.findByText(
        "Sign in or create an account before accepting this invitation.",
      ),
    ).toBeVisible();

    const signInUrl = new URL(
      screen.getByRole("link", { name: "Sign in" }).getAttribute("href") ?? "",
      "http://localhost",
    );
    const registrationUrl = new URL(
      screen
        .getByRole("link", { name: "Create account" })
        .getAttribute("href") ?? "",
      "http://localhost",
    );
    expect(signInUrl.searchParams.get("returnTo")).toBe(
      "/invitations/accept?token=shared-token&type=link",
    );
    expect(registrationUrl.searchParams.get("returnTo")).toBe(
      "/invitations/accept?token=shared-token&type=link",
    );
  });

  it("does not call either endpoint when the token is missing", () => {
    renderPage("/invitations/accept?type=link");

    expect(
      screen.getByText(/verification token is missing/i),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Accept invitation" }),
    ).not.toBeInTheDocument();
    expect(mocks.acceptWorkspaceInvitation).not.toHaveBeenCalled();
    expect(mocks.acceptWorkspaceInviteLink).not.toHaveBeenCalled();
  });
});
