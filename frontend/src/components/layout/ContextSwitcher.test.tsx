import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContextSwitcher from "./ContextSwitcher";

describe("ContextSwitcher", () => {
  it("calls its click handler when the selected context is activated", () => {
    const handleClick = vi.fn();

    render(
      <ContextSwitcher name="TaskForge Dev" initials="TD" onClick={handleClick} />,
    );

    const switcher = screen.getByRole("button", { name: /TaskForge Dev/ });
    expect(switcher).toHaveAttribute("type", "button");

    fireEvent.click(switcher);
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
