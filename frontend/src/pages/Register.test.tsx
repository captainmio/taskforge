import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Register } from "./Register";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  registerAccount: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("../services/auth", () => ({
  register: mocks.registerAccount,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: mocks.showSuccess,
  },
}));

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

const renderRegistrationPage = () => {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );
};

const fillValidForm = () => {
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Ada" },
  });
  fireEvent.change(screen.getByLabelText("Last name"), {
    target: { value: "Lovelace" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "secure-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "secure-password" },
  });
};

describe("Register page", () => {
  beforeEach(() => {
    mocks.registerAccount.mockResolvedValue({
      success: true,
      message: "Account created",
    });
  });

  it("renders an accessible registration form", () => {
    renderRegistrationPage();

    expect(
      screen.getByRole("heading", { name: "Create your Account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveAttribute(
      "autocomplete",
      "given-name",
    );
    expect(screen.getByLabelText("Last name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("shows required errors without calling the API", async () => {
    renderRegistrationPage();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("First Name is required")).toBeVisible();
    expect(screen.getByText("Last Name is required")).toBeVisible();
    expect(screen.getByText("Email is required")).toBeVisible();
    expect(screen.getByText("Password is required")).toBeVisible();
    expect(screen.getByText("Confirm Password is required")).toBeVisible();
    expect(mocks.registerAccount).not.toHaveBeenCalled();
  });

  it("shows format, length, and password confirmation errors", async () => {
    renderRegistrationPage();

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "a".repeat(101) },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Lovelace" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("First Name must be 100 characters or fewer"),
    ).toBeVisible();
    expect(screen.getByText("Invalid email address format")).toBeVisible();
    expect(
      screen.getByText("Password should be more than 7 characters"),
    ).toBeVisible();
    expect(screen.getByText("Passwords do not match")).toBeVisible();
    expect(mocks.registerAccount).not.toHaveBeenCalled();
  });

  it("submits a normalized backend payload and redirects on success", async () => {
    renderRegistrationPage();
    fillValidForm();

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "  Ada " },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: " Lovelace  " },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: " ADA@Example.COM " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(mocks.registerAccount).toHaveBeenCalledWith({
        firstname: "Ada",
        lastname: "Lovelace",
        email: "ada@example.com",
        password: "secure-password",
      });
    });
    expect(mocks.showSuccess).toHaveBeenCalledWith(
      "Account successfully created",
    );
    expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("disables submission while account creation is pending", async () => {
    let resolveRequest:
      ((value: { success: boolean; message: string }) => void) | undefined;
    mocks.registerAccount.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    renderRegistrationPage();
    fillValidForm();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    const pendingButton = await screen.findByRole("button", {
      name: "Creating account...",
    });
    expect(pendingButton).toBeDisabled();

    resolveRequest?.({ success: true, message: "Account created" });

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("shows validation errors returned by the backend", async () => {
    mocks.registerAccount.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: "Validation failed",
          errors: [
            {
              field: "body.email",
              message: "Email is not available",
            },
          ],
        },
      },
    });
    renderRegistrationPage();
    fillValidForm();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    const error = await screen.findByText("Email is not available");
    expect(error).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-describedby",
      "email-error",
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
