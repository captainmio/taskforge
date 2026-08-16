import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("calls its click handler and forwards native button properties", () => {
    const handleClick = vi.fn();

    render(
      <Button
        variant="outline"
        leadingIcon={<span>Invite icon</span>}
        aria-label="Invite member"
        onClick={handleClick}
      >
        Invite
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Invite member" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("bg-white");
    expect(screen.getByText("Invite icon")).toBeVisible();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does not call its click handler when disabled", () => {
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        Save changes
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
