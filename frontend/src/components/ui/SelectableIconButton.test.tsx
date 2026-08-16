import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SelectableIconButton from "./SelectableIconButton";

describe("SelectableIconButton", () => {
  it("announces the selected state and calls the click handler when activated", () => {
    const handleClick = vi.fn();

    render(
      <SelectableIconButton
        icon={<span>Icon</span>}
        label="Team workspace"
        selected
        onClick={handleClick}
      />
    );

    const button = screen.getByRole("button", { name: "Team workspace" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does not call the click handler when the option is disabled", () => {
    const handleClick = vi.fn();

    render(
      <SelectableIconButton
        icon={<span>Icon</span>}
        label="Code workspace"
        disabled
        onClick={handleClick}
      />
    );

    const button = screen.getByRole("button", { name: "Code workspace" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
