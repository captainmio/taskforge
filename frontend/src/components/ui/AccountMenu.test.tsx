import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AccountMenu from "./AccountMenu";

describe("AccountMenu", () => {
  it("shows account details and calls logout when the action is available", () => {
    const handleLogout = vi.fn();

    render(
      <AccountMenu
        name="Reid Jorge"
        email="Reid@example.com"
        onLogout={handleLogout}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Reid Jorge/ }));

    expect(screen.getByText("Reid@example.com")).toBeVisible();
    const logout = screen.getByRole("menuitem", { name: "Log out" });
    expect(logout).toBeEnabled();

    fireEvent.click(logout);
    expect(handleLogout).toHaveBeenCalledOnce();
  });

  it("disables logout when no handler is provided", () => {
    render(<AccountMenu name="Reid Jorge" email="Reid@example.com" />);

    fireEvent.click(screen.getByRole("button", { name: /Reid Jorge/ }));

    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeDisabled();
  });
});
