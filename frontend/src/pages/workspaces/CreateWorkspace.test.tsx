import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceIcon } from "../../types/workspace";
import CreateWorkspace from "./CreateWorkspace";

const mocks = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../../services/workspaces", () => ({
  createWorkspace: mocks.createWorkspace,
}));

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <CreateWorkspace />
    </MemoryRouter>,
  );

const goToInviteStep = async () => {
  fireEvent.change(screen.getByLabelText(/Workspace Name/), {
    target: { value: "  Engineering  " },
  });
  fireEvent.change(screen.getByLabelText(/Description/), {
    target: { value: "  Builds the product.  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(
    await screen.findByRole("heading", { name: "Invite members" }),
  ).toBeVisible();
};

describe("Create workspace page", () => {
  beforeEach(() => {
    mocks.createWorkspace.mockResolvedValue({
      success: true,
      message: "Workspace request accepted",
    });
  });

  it("validates workspace details before moving to invites", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const error = await screen.findByText("Workspace name is required.");
    expect(error).toBeVisible();
    expect(screen.getByLabelText(/Workspace Name/)).toHaveAttribute(
      "aria-describedby",
      "workspace-name-error",
    );
    expect(
      screen.getByRole("heading", { name: "Workspace details" }),
    ).toBeVisible();
  });

  it("submits a normalized request and shows the completed step", async () => {
    renderPage();
    await goToInviteStep();

    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: " DEV@Example.COM " },
    });
    fireEvent.change(screen.getByLabelText(/Role/), {
      target: { value: "ADMIN" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      await screen.findByRole("heading", { name: "Review your workspace" }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    await waitFor(() => {
      expect(mocks.createWorkspace).toHaveBeenCalledWith({
        workspaceName: "Engineering",
        description: "Builds the product.",
        icon: WorkspaceIcon.CODE,
        invites: [{ email: "dev@example.com", role: "ADMIN" }],
      });
    });
    expect(await screen.findByText("Your workspace is ready!")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Create your first project" }),
    ).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: "Invite more members" })[0],
    ).toBeDisabled();
  });

  it("returns to the relevant step when the API rejects an invite field", async () => {
    mocks.createWorkspace.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          errors: [
            {
              field: "body.invites.0.email",
              message: "This member is already invited.",
            },
          ],
        },
      },
    });
    renderPage();
    await goToInviteStep();

    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: "dev@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Role/), {
      target: { value: "MEMBER" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Create workspace" }),
    );

    expect(
      await screen.findByText("This member is already invited."),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Invite members" }),
    ).toBeVisible();
  });

  it("cancels workspace creation by returning to the dashboard", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard");
  });
});
