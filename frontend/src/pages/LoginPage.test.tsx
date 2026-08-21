import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../services/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  login: mocks.login,
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>(
    "react-router",
  );

  return { ...actual, useNavigate: () => mocks.navigate };
});

describe("Login page", () => {
  beforeEach(() => {
    mocks.login.mockResolvedValue({
      success: true,
      user: {
        id: 7,
        email: "owner@example.com",
        firstname: "Workspace",
        lastname: "Owner",
      },
    });
    mocks.getCurrentUser.mockResolvedValue({
      success: true,
      user: {
        id: 7,
        email: "owner@example.com",
        firstname: "Workspace",
        lastname: "Owner",
      },
      workspaces: [{ id: 42, name: "Engineering" }],
    });
  });

  it("routes a successful login to the first joined workspace", async () => {
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const passwordInput = container.querySelector<HTMLInputElement>(
      'input[name="password"]',
    );
    expect(passwordInput).not.toBeNull();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "owner@example.com" },
    });
    fireEvent.change(passwordInput as HTMLInputElement, {
      target: { value: "secret-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith({
        email: "owner@example.com",
        password: "secret-password",
      });
      expect(mocks.navigate).toHaveBeenCalledWith("/workspace/42");
    });
  });
});
