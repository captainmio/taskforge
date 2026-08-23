import { describe, expect, it } from "vitest";
import {
  createProjectSchema,
  deleteProjectSchema,
  projectListSchema,
} from "../../../src/validations/project.validation.js";

const validProject = {
  projectName: "Website Redesign",
  description: "Refresh the marketing site.",
  icon: "desktop",
  status: "planning",
  startDate: "2026-09-01",
  dueDate: "2026-10-01",
  defaultView: "board",
};

describe("createProjectSchema", () => {
  it("accepts a complete project form payload", () => {
    const result = createProjectSchema.safeParse({
      params: { workspaceId: "42" },
      body: validProject,
    });

    expect(result.success).toBe(true);
  });

  it("accepts optional blank project dates", () => {
    const result = createProjectSchema.safeParse({
      params: { workspaceId: "42" },
      body: { ...validProject, startDate: "", dueDate: "" },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a due date before the start date", () => {
    const result = createProjectSchema.safeParse({
      params: { workspaceId: "42" },
      body: { ...validProject, dueDate: "2026-08-31" },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ["body", "dueDate"],
          message: "Due date cannot be earlier than the start date",
        }),
      );
    }
  });

  it.each([
    ["an empty project name", { projectName: "   " }],
    ["an unsupported icon", { icon: "document" }],
    ["an unsupported status", { status: "archived" }],
    ["an invalid workspace ID", {}, { workspaceId: "invalid" }],
  ])("rejects %s", (_, body, params = { workspaceId: "42" }) => {
    const result = createProjectSchema.safeParse({
      params,
      body: { ...validProject, ...body },
    });

    expect(result.success).toBe(false);
  });
});

describe("projectListSchema", () => {
  it("accepts a positive workspace ID", () => {
    expect(projectListSchema.safeParse({ params: { workspaceId: "42" } }).success)
      .toBe(true);
  });

  it.each(["0", "-1", "invalid", "9007199254740992"])(
    "rejects an invalid workspace ID of %s",
    (workspaceId) => {
      expect(projectListSchema.safeParse({ params: { workspaceId } }).success)
        .toBe(false);
    },
  );
});

describe("deleteProjectSchema", () => {
  it("accepts positive workspace and project IDs", () => {
    expect(deleteProjectSchema.safeParse({
      params: { workspaceId: "42", projectId: "25" },
    }).success).toBe(true);
  });

  it.each([
    [{ workspaceId: "invalid", projectId: "25" }],
    [{ workspaceId: "42", projectId: "0" }],
    [{ workspaceId: "42", projectId: "9007199254740992" }],
  ])("rejects invalid route parameters", (params) => {
    expect(deleteProjectSchema.safeParse({ params }).success).toBe(false);
  });
});
