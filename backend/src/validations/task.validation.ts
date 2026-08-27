import { z } from "zod";

const positiveIdSchema = (label: string) =>
  z
    .string()
    .regex(/^[1-9]\d*$/, `${label} must be a positive integer`)
    .refine(
      (value) => Number.isSafeInteger(Number(value)),
      `${label} is too large`,
    );

const assigneeIdSchema = positiveIdSchema("Assignee ID").transform(Number);

export const createTaskSchema = z.object({
  params: z.object({
    workspaceId: positiveIdSchema("Workspace ID"),
    projectId: positiveIdSchema("Project ID"),
  }),
  body: z
    .object({
      title: z.string().trim().min(1, "Task title is required").max(200),
      description: z.string().trim().max(10_000),
      status: z.enum(["todo", "in_progress", "in_review", "done"]),
      priority: z.enum(["low", "medium", "high"]),
      assigneeIds: z.array(assigneeIdSchema).max(100),
      dueDate: z.string().trim().max(50).nullable(),
      timeEstimate: z.string().trim().max(50).nullable(),
    })
    .strict(),
});

export type CreateTaskBody = z.infer<typeof createTaskSchema>["body"];
export type CreateTaskParams = z.infer<typeof createTaskSchema>["params"];
