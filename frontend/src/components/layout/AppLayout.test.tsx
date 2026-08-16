import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppLayout from "./AppLayout";

describe("AppLayout", () => {
  it("opens and closes the mobile navigation", () => {
    render(
      <AppLayout sidebar={<span>Navigation content</span>}>
        <h1>Page content</h1>
      </AppLayout>,
    );

    expect(screen.getAllByText("Navigation content")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getAllByText("Navigation content")).toHaveLength(2);

    const closeButtons = screen.getAllByRole("button", { name: "Close navigation" });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    expect(screen.getAllByText("Navigation content")).toHaveLength(1);
  });
});
