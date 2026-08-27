import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import TimeEstimateField from "./TimeEstimateField";

const EstimateHarness = () => {
  const [value, setValue] = useState("");
  return <TimeEstimateField value={value} onChange={setValue} />;
};

describe("TimeEstimateField", () => {
  it("shows a normalized duration and total hours for valid input", () => {
    render(<EstimateHarness />);
    const input = screen.getByRole("textbox", { name: /Time estimate/ });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "1d 10h" } });

    expect(screen.getByText("2 days 2 hours")).toBeVisible();
    expect(screen.getByText("(18 hours total)")).toBeVisible();
  });

  it("explains the required format for invalid input", () => {
    render(<EstimateHarness />);
    const input = screen.getByRole("textbox", { name: /Time estimate/ });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "tomorrow" } });

    expect(
      screen.getByText("Use days and hours, for example: 1d 4h."),
    ).toBeVisible();
  });
});
