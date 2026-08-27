import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Textbox from "./Textbox";

describe("Textbox", () => {
  it("forwards native input properties and its ref", () => {
    const inputRef = createRef<HTMLInputElement>();

    render(
      <>
        <label htmlFor="email">Email</label>
        <Textbox
          ref={inputRef}
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          disabled
        />
      </>,
    );

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input).toHaveAttribute("placeholder", "name@example.com");
    expect(input).toBeDisabled();
    expect(inputRef.current).toBe(input);
  });

  it("renders a decorative icon without changing the accessible name", () => {
    render(
      <>
        <label htmlFor="name">Name</label>
        <Textbox id="name" icon={<span data-testid="field-icon">Icon</span>} />
      </>,
    );

    expect(screen.getByLabelText("Name")).toHaveAccessibleName("Name");
    expect(
      screen.getByTestId("field-icon").closest('[aria-hidden="true"]'),
    ).toBeInTheDocument();
  });
});
