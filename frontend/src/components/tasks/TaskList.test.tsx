import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskList from "./TaskList";
import type { Task } from "./taskTypes";

const createTask = (id: number, overrides: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  description: "Short task description.",
  assignee: "Alex Morgan",
  assignees: [{ id: 4, name: "Alex Morgan" }],
  dueDate: "2026-09-02",
  priority: "medium",
  status: "todo",
  ...overrides,
});

const renderList = (tasks: Task[], onTaskClick = vi.fn()) => {
  render(
    <TaskList
      tasks={tasks}
      onTaskClick={onTaskClick}
    />,
  );

  return onTaskClick;
};

describe("TaskList", () => {
  it("limits a long task description to 100 characters", () => {
    const description = "a".repeat(101);
    renderList([createTask(1, { description })]);
    const taskDescription = screen
      .getByText("Task 1")
      .parentElement?.querySelector("p.mt-1");

    expect(taskDescription).toHaveTextContent(`${"a".repeat(100)}…`);
    expect(taskDescription).not.toHaveTextContent(description);
  });

  it("paginates task rows with the shared pagination controls", () => {
    renderList(Array.from({ length: 11 }, (_, index) => createTask(index + 1)));

    const pagination = screen.getByRole("navigation", {
      name: "tasks pagination",
    });
    expect(pagination).toHaveTextContent("Showing 1-10 of 11 tasks");
    expect(screen.getByText("Task 1")).toBeVisible();
    expect(screen.queryByText("Task 11")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(pagination).toHaveTextContent("Showing 11-11 of 11 tasks");
    expect(screen.getByText("Task 11")).toBeVisible();
    expect(screen.queryByText("Task 1")).not.toBeInTheDocument();
  });

  it("sorts task rows when a sortable table header is clicked", () => {
    renderList([
      createTask(1, { title: "Zulu task" }),
      createTask(2, { title: "Alpha task" }),
    ]);
    const table = screen.getByRole("table", { name: "Project tasks" });
    const taskHeader = within(table).getByRole("columnheader", {
      name: "Task",
    });

    fireEvent.click(within(taskHeader).getByRole("button"));

    expect(within(table).getAllByRole("row")[1]).toHaveTextContent(
      "Alpha task",
    );
  });
});
