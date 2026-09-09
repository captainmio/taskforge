import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "./ResetPasswordPage";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  resetPassword: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../services/auth", () => ({ resetPassword: mocks.resetPassword }));
vi.mock("react-toastify", () => ({ toast: { success: mocks.toastSuccess } }));
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => mocks.navigate };
});

describe("Reset password page", () => {
  beforeEach(() => {
    mocks.resetPassword.mockResolvedValue({
      success: true,
      message: "Password reset. You can now log in.",
    });
  });

  it("explains when the reset link lacks its token", () => {
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    expect(screen.getByRole("alert")).toHaveTextContent("link is incomplete");
    expect(screen.queryByRole("button", { name: "Save new password" })).not.toBeInTheDocument();
  });

  it("validates matching passwords and redirects after saving", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/reset-password?token=reset-token"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );
    const passwordInputs = container.querySelectorAll<HTMLInputElement>('input[type="password"]');

    fireEvent.change(passwordInputs[0]!, { target: { value: "new-password" } });
    fireEvent.change(passwordInputs[1]!, { target: { value: "different-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match");

    fireEvent.change(passwordInputs[1]!, { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));

    await waitFor(() => {
      expect(mocks.resetPassword).toHaveBeenCalledWith("reset-token", "new-password");
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Password reset. You can now log in.");
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });
});
