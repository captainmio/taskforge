import { render, screen } from "@testing-library/react";
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
  project: "Website Redesign",
  projectIcon: "desktop",
  assignee: "Rustam Jordan",
  dueDate: "Jun 30, 2024",
  priority: "high",
  status: "todo",
};

describe("TaskCard", () => {
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
});
