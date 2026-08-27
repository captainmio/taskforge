import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContextSwitcher from "./ContextSwitcher";

describe("ContextSwitcher", () => {
  it("calls its click handler when the selected context is activated", () => {
    const handleClick = vi.fn();

    render(
      <ContextSwitcher
        name="TaskForge Dev"
        initials="TD"
        onClick={handleClick}
      />,
    );

    const switcher = screen.getByRole("button", { name: /TaskForge Dev/ });
    expect(switcher).toHaveAttribute("type", "button");

    fireEvent.click(switcher);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("lists joined workspaces, marks the current one, and closes after selection", () => {
    const handleWorkspaceChange = vi.fn();

    render(
      <ContextSwitcher
        name="Engineering"
        initials="EN"
        workspaces={[
          { id: 42, name: "Engineering" },
          { id: 84, name: "Product Design" },
        ]}
        currentWorkspaceId={42}
        onWorkspaceChange={handleWorkspaceChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Engineering/ }));

    expect(
      screen.getByRole("menuitem", { name: /Engineering.*Current/ }),
    ).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("menuitem", { name: /Product Design/ }));

    expect(handleWorkspaceChange).toHaveBeenCalledWith(84);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("shows an empty state when the user has no joined workspaces", () => {
    render(
      <ContextSwitcher
        name="No workspace"
        initials="NW"
        workspaces={[]}
        onWorkspaceChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /No workspace/ }));

    expect(screen.getByText("No joined workspaces")).toBeVisible();
  });
});
