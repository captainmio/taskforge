import { describe, expect, it } from "vitest";
import { createProjectSchema } from "../../../src/validations/project.validation.js";

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
