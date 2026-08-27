import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import TaskAssigneeMultiSelect, {
  type TaskAssignee,
} from "./TaskAssigneeMultiSelect";

const members: TaskAssignee[] = [
  { id: "rustam", name: "Rustam Jordan", email: "rustam@example.com" },
  { id: "alex", name: "Alex Morgan", email: "alex@example.com" },
];

const AssigneeHarness = () => {
  const [value, setValue] = useState<TaskAssignee[]>([]);
  return (
    <TaskAssigneeMultiSelect
      members={members}
      value={value}
      onChange={setValue}
    />
  );
};

describe("TaskAssigneeMultiSelect", () => {
  it("filters members and adds or removes a selected assignee", () => {
    render(<AssigneeHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Select members" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Search members" }), {
      target: { value: "alex" },
    });
    expect(screen.getByText("Alex Morgan")).toBeVisible();
    expect(screen.queryByText("Rustam Jordan")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: /Alex Morgan.*alex@example.com/ }),
    );
    expect(
      screen.getByRole("button", { name: "Remove Alex Morgan" }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Remove Alex Morgan" }));
    expect(
      screen.queryByRole("button", { name: "Remove Alex Morgan" }),
    ).toBeNull();
  });

  it("closes its member list when Escape is pressed", () => {
    render(<AssigneeHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Select members" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("list", { name: "Workspace members" }),
    ).toBeNull();
  });
});
