import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import NavItem from "./NavItem";

describe("NavItem", () => {
  it("marks the link active when its destination matches the current route", () => {
    render(
      <MemoryRouter initialEntries={["/workspace/7"]}>
        <NavItem to="/workspace/7" icon={<span>Icon</span>} label="Overview" end />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /Overview/ });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveClass("bg-green-50");
  });

  it("renders a non-navigable item when disabled", () => {
    render(
      <MemoryRouter>
        <NavItem to="/members" icon={<span>Icon</span>} label="Members" disabled />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: /Members/ })).not.toBeInTheDocument();
    expect(screen.getByText("Members").closest("[aria-disabled='true']")).toBeInTheDocument();
  });
});
