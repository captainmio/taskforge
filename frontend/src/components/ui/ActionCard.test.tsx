import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ActionCard from "./ActionCard";

describe("ActionCard", () => {
  it("shows its action details and calls the click handler when selected", () => {
    const handleClick = vi.fn();

    render(
      <ActionCard
        icon={<span>Icon</span>}
        title="Create your first project"
        description="Organize your work into projects."
        onClick={handleClick}
      />,
    );

    const button = screen.getByRole("button", {
      name: /Create your first project/,
    });
    expect(button).toHaveAttribute("type", "button");
    expect(screen.getByText("Organize your work into projects.")).toBeVisible();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("prevents the action from running when the card is disabled", () => {
    const handleClick = vi.fn();

    render(
      <ActionCard
        icon={<span>Icon</span>}
        title="Workspace settings"
        description="Update workspace details."
        disabled
        onClick={handleClick}
      />,
    );

    const button = screen.getByRole("button", { name: /Workspace settings/ });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
