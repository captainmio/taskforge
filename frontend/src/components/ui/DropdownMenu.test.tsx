import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DropdownMenu from "./DropdownMenu";

const renderMenu = () =>
  render(
    <div>
      <DropdownMenu trigger={(isOpen) => <span>{isOpen ? "Close options" : "Open options"}</span>}>
        <button type="button" role="menuitem">
          Menu action
        </button>
      </DropdownMenu>
      <button type="button">Outside action</button>
    </div>,
  );

describe("DropdownMenu", () => {
  it("opens and closes from its trigger while announcing its state", () => {
    renderMenu();

    const trigger = screen.getByRole("button", { name: "Open options" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Close options" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("menu")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Close options" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes when Escape is pressed", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Open options" }));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes when a pointer press occurs outside the menu", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Open options" }));

    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside action" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
