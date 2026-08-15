import { z } from "zod";

const workspaceIconSchema = z.enum([
  "code",
  "business",
  "team",
  "launch",
  "goals",
]);

const workspaceRoleSchema = z.enum(["ADMIN", "MEMBER"]);

export const createWorkspaceSchema = z.object({
  body: z.object({
    workspaceName: z.string().trim().min(1, "Workspace name is required").max(100),
    description: z.string().trim().max(500),
    icon: workspaceIconSchema,
    invites: z.array(
      z.object({
        email: z.email("A valid invite email is required"),
        role: workspaceRoleSchema,
      })
    ),
  }),
});
