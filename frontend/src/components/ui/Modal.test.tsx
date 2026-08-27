import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

describe("Modal", () => {
  it("does not render dialog content while closed", () => {
    render(
      <Modal isOpen={false} title="Edit member" onClose={vi.fn()}>
        <p>Dialog content</p>
      </Modal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a labelled dialog with content and footer", () => {
    render(
      <Modal
        isOpen
        title="Edit member"
        onClose={vi.fn()}
        footer={<button type="button">Save changes</button>}
      >
        <p>Choose a role</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Edit member" })).toBeVisible();
    expect(screen.getByText("Choose a role")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeVisible();
  });

  it("closes from the close button, backdrop, and Escape key", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen title="Remove member" onClose={onClose}>
        <p>Confirm removal</p>
      </Modal>,
    );

    const closeButtons = screen.getAllByRole("button", { name: "Close modal" });
    fireEvent.click(closeButtons[1]);
    fireEvent.click(closeButtons[0]);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("moves focus into the dialog and restores page focus and scrolling", () => {
    const { rerender } = render(
      <>
        <button type="button">Open editor</button>
        <Modal isOpen={false} title="Edit member" onClose={vi.fn()}>
          <p>Dialog content</p>
        </Modal>
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Open editor" });
    trigger.focus();

    rerender(
      <>
        <button type="button">Open editor</button>
        <Modal isOpen title="Edit member" onClose={vi.fn()}>
          <p>Dialog content</p>
        </Modal>
      </>,
    );

    expect(
      screen.getAllByRole("button", { name: "Close modal" })[1],
    ).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <>
        <button type="button">Open editor</button>
        <Modal isOpen={false} title="Edit member" onClose={vi.fn()}>
          <p>Dialog content</p>
        </Modal>
      </>,
    );

    expect(screen.getByRole("button", { name: "Open editor" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });
});
