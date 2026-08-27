import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Select from "./Select";

describe("Select", () => {
  it("forwards native select properties, changes, and its ref", () => {
    const selectRef = createRef<HTMLSelectElement>();
    const handleChange = vi.fn();

    render(
      <>
        <label htmlFor="status">Status</label>
        <Select
          ref={selectRef}
          id="status"
          name="status"
          defaultValue="planning"
          required
          onChange={handleChange}
        >
          <option value="planning">Planning</option>
          <option value="active">Active</option>
        </Select>
      </>,
    );

    const select = screen.getByRole("combobox", { name: "Status" });
    fireEvent.change(select, { target: { value: "active" } });

    expect(select).toHaveValue("active");
    expect(select).toHaveAttribute("name", "status");
    expect(select).toBeRequired();
    expect(selectRef.current).toBe(select);
    expect(handleChange).toHaveBeenCalledOnce();
  });

  it("renders a decorative leading icon without changing the accessible name", () => {
    render(
      <>
        <label htmlFor="view">Default View</label>
        <Select
          id="view"
          leadingIcon={<span data-testid="select-icon">Icon</span>}
        >
          <option value="list">List View</option>
        </Select>
      </>,
    );

    expect(
      screen.getByRole("combobox", { name: "Default View" }),
    ).toHaveAccessibleName("Default View");
    expect(
      screen.getByTestId("select-icon").closest('[aria-hidden="true"]'),
    ).toBeInTheDocument();
  });
});
