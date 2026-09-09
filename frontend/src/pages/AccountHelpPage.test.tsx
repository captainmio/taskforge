import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountHelpPage from "./AccountHelpPage";

const mocks = vi.hoisted(() => ({
  resendEmailVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../services/auth", () => ({
  resendEmailVerification: mocks.resendEmailVerification,
  requestPasswordReset: mocks.requestPasswordReset,
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
    mocks.requestPasswordReset.mockResolvedValue({
      success: true,
      message: "Password reset email sent",
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
      expect(mocks.resendEmailVerification).toHaveBeenCalledWith("ADA@Example.COM");
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Verification email sent");
    });
  });

  it("validates and sends a password reset email", async () => {
    render(
      <MemoryRouter>
        <AccountHelpPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Reset password" }));

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: " ADA@Example.COM " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Send password reset link" }),
    );

    await waitFor(() => {
      expect(mocks.requestPasswordReset).toHaveBeenCalledWith("ADA@Example.COM");
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Password reset email sent");
    });
  });
});
