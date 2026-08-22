import { z } from "zod";

const workspaceIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "Workspace ID must be a positive integer")
  .refine(
    (workspaceId) => Number.isSafeInteger(Number(workspaceId)),
    "Workspace ID is too large",
  );

const projectIconSchema = z.enum([
  "desktop",
  "mobile",
  "code",
  "launch",
  "flag",
  "database",
  "server",
  "design",
  "analytics",
  "marketing",
  "commerce",
  "quality",
]);

const optionalProjectDateSchema = z.union([z.iso.date(), z.literal("")]);

export const createProjectSchema = z.object({
  params: z.object({ workspaceId: workspaceIdSchema }),
  body: z.object({
    projectName: z.string().trim().min(1, "Project name is required").max(100),
    description: z.string().trim().max(500),
    icon: projectIconSchema,
    status: z.enum(["planning", "active", "on-hold", "completed"]),
    startDate: optionalProjectDateSchema,
    dueDate: optionalProjectDateSchema,
    defaultView: z.enum(["list", "board", "calendar"]),
  }).strict().superRefine((project, context) => {
    if (
      project.startDate &&
      project.dueDate &&
      project.dueDate < project.startDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date cannot be earlier than the start date",
      });
    }
  }),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>["body"];
export type CreateProjectParams = z.infer<typeof createProjectSchema>["params"];
