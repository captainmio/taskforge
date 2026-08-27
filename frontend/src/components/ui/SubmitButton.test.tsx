import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SubmitButton from "./SubmitButton";

describe("SubmitButton", () => {
  it("uses submit as its default type and forwards button properties", () => {
    const handleClick = vi.fn();

    render(
      <SubmitButton className="custom-class" onClick={handleClick}>
        Save
      </SubmitButton>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("custom-class");

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("supports an explicit type and disabled state", () => {
    render(
      <SubmitButton type="button" disabled>
        Cancel
      </SubmitButton>,
    );

    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeDisabled();
  });
});
