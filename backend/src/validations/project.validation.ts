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

const projectBodySchema = z.object({
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
  });

export const createProjectSchema = z.object({
  params: z.object({ workspaceId: workspaceIdSchema }),
  body: projectBodySchema,
});

export const projectListSchema = z.object({
  params: z.object({ workspaceId: workspaceIdSchema }),
});

export const deleteProjectSchema = z.object({
  params: z.object({
    workspaceId: workspaceIdSchema,
    projectId: workspaceIdSchema,
  }),
});

export const projectDetailSchema = z.object({
  params: z.object({
    workspaceId: workspaceIdSchema,
    projectId: workspaceIdSchema,
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    workspaceId: workspaceIdSchema,
    projectId: workspaceIdSchema,
  }),
  body: projectBodySchema,
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>["body"];
export type CreateProjectParams = z.infer<typeof createProjectSchema>["params"];
export type ProjectListParams = z.infer<typeof projectListSchema>["params"];
export type DeleteProjectParams = z.infer<typeof deleteProjectSchema>["params"];
export type ProjectDetailParams = z.infer<typeof projectDetailSchema>["params"];
export type UpdateProjectBody = z.infer<typeof updateProjectSchema>["body"];
export type UpdateProjectParams = z.infer<typeof updateProjectSchema>["params"];
