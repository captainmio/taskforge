import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskBoard from "./TaskBoard";
import type { Task } from "./taskTypes";

const tasks: Task[] = [
  {
    id: 1,
    title: "Plan release",
    description: "Coordinate the release checklist.",
    assignee: "Rustam Jordan",
    dueDate: "Jun 30, 2024",
    priority: "high",
    status: "todo",
  },
  {
    id: 2,
    title: "Ship release",
    description: "Deploy the approved release.",
    assignee: "Alex Morgan",
    dueDate: "Jul 1, 2024",
    priority: "low",
    status: "done",
  },
];

describe("TaskBoard", () => {
  it("places tasks in their status columns and selects the clicked task", () => {
    const onTaskClick = vi.fn();
    render(
      <TaskBoard tasks={tasks} onTaskClick={onTaskClick} onAddTask={vi.fn()} />,
    );

    expect(screen.getByText("Plan release")).toBeVisible();
    expect(screen.getByText("Ship release")).toBeVisible();
    expect(screen.getByText("To Do").parentElement).toHaveTextContent("1");
    expect(screen.getByText("In Progress").parentElement).toHaveTextContent(
      "0",
    );
    expect(screen.getByText("In Review").parentElement).toHaveTextContent("0");
    expect(screen.getByText("Done").parentElement).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: /Plan release/ }));
    expect(onTaskClick).toHaveBeenCalledWith(tasks[0]);
  });

  it("starts a new task with the status of its column", () => {
    const onAddTask = vi.fn();
    render(
      <TaskBoard tasks={tasks} onTaskClick={vi.fn()} onAddTask={onAddTask} />,
    );

    const inReviewColumn = screen.getByText("In Review").closest("section");
    expect(inReviewColumn).not.toBeNull();
    fireEvent.click(
      within(inReviewColumn as HTMLElement).getByRole("button", {
        name: "Add task",
      }),
    );

    expect(onAddTask).toHaveBeenCalledWith("in_review");
  });

  it("orders cards within a column by position", () => {
    render(
      <TaskBoard
        tasks={[
          { ...tasks[0], id: 3, title: "Third", position: 2 },
          { ...tasks[0], id: 1, title: "First", position: 0 },
          { ...tasks[0], id: 2, title: "Second", position: 1 },
        ]}
        onTaskClick={vi.fn()}
        onAddTask={vi.fn()}
      />,
    );

    const todoColumn = screen.getByText("To Do").closest("section");
    expect(todoColumn).not.toBeNull();
    const cardOrder = within(todoColumn as HTMLElement)
      .getAllByRole("button")
      .map((button) => button.textContent ?? "")
      .filter((text) => /^(First|Second|Third)/.test(text))
      .map((text) => text.match(/^(First|Second|Third)/)?.[0]);
    expect(cardOrder).toEqual(["First", "Second", "Third"]);
  });
});
