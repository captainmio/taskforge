import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountHelpPage from "./AccountHelpPage";

const mocks = vi.hoisted(() => ({
  resendEmailVerification: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../services/auth", () => ({
  resendEmailVerification: mocks.resendEmailVerification,
}));

vi.mock("react-toastify", () => ({
  toast: { success: mocks.toastSuccess },
}));

describe("Account help page", () => {
  beforeEach(() => {
    mocks.resendEmailVerification.mockResolvedValue({
      success: true,
      message: "Verification email sent",
    });
  });

  it("validates and sends a verification email", async () => {
    render(
      <MemoryRouter>
        <AccountHelpPage />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Send verification email" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Email address is required",
      );
    });

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: " ADA@Example.COM " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Send verification email" }),
    );

    await waitFor(() => {
      expect(mocks.resendEmailVerification).toHaveBeenCalledWith("ada@example.com");
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Verification email sent");
    });
  });

  it("shows the password reset feature as unavailable", () => {
    render(
      <MemoryRouter>
        <AccountHelpPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Reset password" }));

    expect(screen.getByText(/Password reset is being prepared/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send password reset link" }),
    ).toBeDisabled();
  });
});
