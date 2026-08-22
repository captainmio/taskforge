import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SectionCard from "./SectionCard";

describe("SectionCard", () => {
  it("renders a themed title, action, and additional left body padding", () => {
    render(
      <SectionCard title="Project details" action={<a href="/projects">View projects</a>}>
        <p>Project form fields</p>
      </SectionCard>,
    );

    const heading = screen.getByRole("heading", { name: "Project details" });
    const region = screen.getByRole("region", { name: "Project details" });

    expect(heading).toHaveClass("text-green-800");
    expect(heading.closest("header")).toHaveClass("bg-emerald-100/70");
    expect(screen.getByRole("link", { name: "View projects" })).toBeVisible();
    expect(screen.getByText("Project form fields").parentElement).toHaveClass("pl-6");
    expect(region).toHaveAttribute("aria-labelledby", heading.id);
  });

  it("omits the title header and additional left padding when no title is provided", () => {
    const { container } = render(
      <SectionCard>
        <p>Untitled content</p>
      </SectionCard>,
    );

    const region = container.querySelector("section");
    const body = screen.getByText("Untitled content").parentElement;

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(region).not.toHaveAttribute("aria-labelledby");
    expect(body).toHaveClass("p-4");
    expect(body).not.toHaveClass("pl-6");
  });
});
