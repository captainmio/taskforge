import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskCard from "./TaskCard";
import type { Task } from "./taskTypes";

const mocks = vi.hoisted(() => ({ draggableProps: vi.fn() }));

vi.mock("@hello-pangea/dnd", () => ({
  Draggable: ({
    children,
    ...props
  }: {
    children: (provided: {
      innerRef: () => void;
      draggableProps: object;
      dragHandleProps: object;
    }) => React.ReactNode;
    disableInteractiveElementBlocking?: boolean;
  }) => {
    mocks.draggableProps(props);
    return children({
      innerRef: () => undefined,
      draggableProps: {},
      dragHandleProps: {},
    });
  },
}));

const task: Task = {
  id: 1,
  title: "Plan release",
  description: "Coordinate the release checklist.",
  assignee: "Rustam Jordan",
  dueDate: "Jun 30, 2024",
  priority: "high",
  status: "todo",
};

describe("TaskCard", () => {
  it("formats an ISO due date for display", () => {
    render(
      <TaskCard
        task={{ ...task, dueDate: "2026-09-15" }}
        index={0}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText(/2026/)).toBeVisible();
    expect(screen.queryByText("2026-09-15")).toBeNull();
  });

  it("allows its button to act as a drag handle and shows a grabbing cursor while pressed", () => {
    render(<TaskCard task={task} index={0} onClick={vi.fn()} />);

    expect(mocks.draggableProps).toHaveBeenCalledWith(
      expect.objectContaining({ disableInteractiveElementBlocking: true }),
    );
    expect(screen.getByRole("button", { name: /Plan release/ })).toHaveClass(
      "cursor-pointer",
      "active:cursor-grabbing",
    );
  });

  it("shows the full description from the info control when the preview is long", () => {
    const description = "A".repeat(141);
    render(
      <TaskCard task={{ ...task, description }} index={0} onClick={vi.fn()} />,
    );

    expect(screen.getByText(`${"A".repeat(140)}…`)).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Show full task description" }),
    );

    expect(screen.getByRole("tooltip")).toHaveTextContent(description);
  });

  it("uses an avatar group for assignees and hides it when unassigned", () => {
    const assignees = [
      { id: 1, name: "Alex Member" },
      { id: 2, name: "Jamie Lee" },
      { id: 3, name: "Morgan Chen" },
      { id: 4, name: "Taylor Kim" },
    ];
    const { rerender } = render(
      <TaskCard
        task={{
          ...task,
          assignee: assignees.map(({ name }) => name).join(", "),
          assignees,
        }}
        index={0}
        onClick={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText(
        `Assignees: ${task.assignee.replace("Rustam Jordan", assignees.map(({ name }) => name).join(", "))}`,
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("1 more members")).toBeVisible();

    rerender(
      <TaskCard
        task={{ ...task, assignee: "Unassigned", assignees: [] }}
        index={0}
        onClick={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Assignees: Unassigned")).toBeNull();
  });
});
