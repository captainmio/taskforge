import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskBoard from "./TaskBoard";
import type { Task } from "./taskTypes";

const tasks: Task[] = [
  {
    id: 1,
    title: "Plan release",
    project: "Website Redesign",
    projectIcon: "desktop",
    assignee: "Rustam Jordan",
    dueDate: "Jun 30, 2024",
    priority: "high",
    status: "todo",
  },
  {
    id: 2,
    title: "Ship release",
    project: "Website Redesign",
    projectIcon: "desktop",
    assignee: "Alex Morgan",
    dueDate: "Jul 1, 2024",
    priority: "low",
    status: "done",
  },
];

describe("TaskBoard", () => {
  it("places tasks in their status columns and selects the clicked task", () => {
    const onTaskClick = vi.fn();
    render(<TaskBoard tasks={tasks} onTaskClick={onTaskClick} onAddTask={vi.fn()} />);

    expect(screen.getByText("Plan release")).toBeVisible();
    expect(screen.getByText("Ship release")).toBeVisible();
    expect(screen.getByText("To Do").parentElement).toHaveTextContent("1");
    expect(screen.getByText("In Progress").parentElement).toHaveTextContent("0");
    expect(screen.getByText("In Review").parentElement).toHaveTextContent("0");
    expect(screen.getByText("Done").parentElement).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: /Plan release/ }));
    expect(onTaskClick).toHaveBeenCalledWith(tasks[0]);
  });

  it("starts a new task with the status of its column", () => {
    const onAddTask = vi.fn();
    render(<TaskBoard tasks={tasks} onTaskClick={vi.fn()} onAddTask={onAddTask} />);

    const inReviewColumn = screen.getByText("In Review").closest("section");
    expect(inReviewColumn).not.toBeNull();
    fireEvent.click(within(inReviewColumn as HTMLElement).getByRole("button", { name: "Add task" }));

    expect(onAddTask).toHaveBeenCalledWith("in_review");
  });
});
