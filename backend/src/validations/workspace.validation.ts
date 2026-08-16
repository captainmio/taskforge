import { z } from "zod";

const workspaceIconSchema = z.enum([
  "code",
  "business",
  "team",
  "launch",
  "goals",
]);

const workspaceRoleSchema = z.enum(["ADMIN", "MEMBER"]);

const workspaceInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320)
    .pipe(z.email("A valid invite email is required")),
  role: workspaceRoleSchema,
});

const workspaceInvitesSchema = z
  .array(workspaceInviteSchema)
  .max(500, "A workspace can include at most 500 invitations")
  .superRefine((invites, context) => {
    const seenEmails = new Set<string>();

    invites.forEach((invite, index) => {
      if (seenEmails.has(invite.email)) {
        context.addIssue({
          code: "custom",
          path: [index, "email"],
          message: "Each email address can only be invited once",
        });
      }

      seenEmails.add(invite.email);
    });
  });

export const createWorkspaceSchema = z.object({
  body: z.object({
    workspaceName: z.string().trim().min(1, "Workspace name is required").max(100),
    description: z.string().trim().max(500),
    icon: workspaceIconSchema,
    invites: workspaceInvitesSchema,
  }),
});

export const acceptWorkspaceInvitationSchema = z.object({
  body: z.object({
    token: z.string().trim().min(1, "Invitation token is required").max(512),
  }),
});

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceSchema>["body"];
export type AcceptWorkspaceInvitationBody = z.infer<
  typeof acceptWorkspaceInvitationSchema
>["body"];
