import { describe, expect, it } from "vitest";
import {
  createTaskSchema,
  projectTasksSchema,
  updateTaskSchema,
} from "../../../src/validations/task.validation.js";

const validTask = {
  title: "Implement login flow",
  description: "Connect the sign-in form to authentication.",
  status: "todo",
  priority: "medium",
  assigneeIds: ["7", "12"],
  dueDate: "2026-09-15",
  timeEstimate: "1d 4h",
};

describe("createTaskSchema", () => {
  it("accepts a complete task payload and converts assignee IDs to numbers", () => {
    const result = createTaskSchema.safeParse({
      params: { workspaceId: "42", projectId: "25" },
      body: validTask,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body.assigneeIds).toEqual([7, 12]);
  });

  it.each([
    ["an empty title", { title: "   " }],
    ["an unsupported status", { status: "blocked" }],
    ["an invalid assignee ID", { assigneeIds: ["not-an-id"] }],
    ["too many assignees", { assigneeIds: Array.from({ length: 101 }, () => "7") }],
  ])("rejects %s", (_, body) => {
    expect(
      createTaskSchema.safeParse({
        params: { workspaceId: "42", projectId: "25" },
        body: { ...validTask, ...body },
      }).success,
    ).toBe(false);
  });
});

describe("projectTasksSchema", () => {
  it("accepts valid pagination query values", () => {
    const result = projectTasksSchema.safeParse({
      params: { workspaceId: "42", projectId: "25" },
      query: { page: "2", pageSize: "100" },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a page size above the shared maximum", () => {
    expect(
      projectTasksSchema.safeParse({
        params: { workspaceId: "42", projectId: "25" },
        query: { pageSize: "101" },
      }).success,
    ).toBe(false);
  });
});

describe("updateTaskSchema", () => {
  it("accepts a partial update and converts supplied assignee IDs to numbers", () => {
    const result = updateTaskSchema.safeParse({
      params: { workspaceId: "42", projectId: "25", taskId: "101" },
      body: { assigneeIds: ["7", "12"] },
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body.assigneeIds).toEqual([7, 12]);
  });

  it("rejects an update without fields", () => {
    expect(
      updateTaskSchema.safeParse({
        params: { workspaceId: "42", projectId: "25", taskId: "101" },
        body: {},
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid task ID", () => {
    expect(
      updateTaskSchema.safeParse({
        params: { workspaceId: "42", projectId: "25", taskId: "0" },
        body: { status: "done" },
      }).success,
    ).toBe(false);
  });
});
