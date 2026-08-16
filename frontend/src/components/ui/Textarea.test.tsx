import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Textarea from "./Textarea";

describe("Textarea", () => {
  it("accepts user input and forwards native properties and its ref", () => {
    const textareaRef = createRef<HTMLTextAreaElement>();
    const handleChange = vi.fn();

    render(
      <>
        <label htmlFor="description">Description</label>
        <Textarea
          ref={textareaRef}
          id="description"
          name="description"
          placeholder="Describe the workspace"
          maxLength={500}
          onChange={handleChange}
        />
      </>
    );

    const textarea = screen.getByLabelText("Description");
    fireEvent.change(textarea, { target: { value: "Product workspace" } });

    expect(textarea).toHaveValue("Product workspace");
    expect(textarea).toHaveAttribute("name", "description");
    expect(textarea).toHaveAttribute("placeholder", "Describe the workspace");
    expect(textarea).toHaveAttribute("maxlength", "500");
    expect(textareaRef.current).toBe(textarea);
    expect(handleChange).toHaveBeenCalledOnce();
  });

  it("renders a decorative icon and applies the requested height and resize behavior", () => {
    render(
      <>
        <label htmlFor="notes">Notes</label>
        <Textarea
          id="notes"
          icon={<span data-testid="textarea-icon">Icon</span>}
          height={120}
          resizable={false}
        />
      </>
    );

    const textarea = screen.getByLabelText("Notes");
    expect(textarea).toHaveAccessibleName("Notes");
    expect(textarea).toHaveStyle({ height: "120px" });
    expect(textarea).toHaveClass("resize-none");
    expect(
      screen.getByTestId("textarea-icon").closest('[aria-hidden="true"]')
    ).toBeInTheDocument();
  });
});
