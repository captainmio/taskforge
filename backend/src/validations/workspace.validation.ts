import { z } from "zod";
import { MAX_PAGE_SIZE } from "../config/pagination.js";

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

const workspaceParamsSchema = z.object({
  workspaceId: z
    .string()
    .regex(/^[1-9]\d*$/, "Workspace ID must be a positive integer")
    .refine(
      (workspaceId) => Number.isSafeInteger(Number(workspaceId)),
      "Workspace ID is too large",
    ),
});

export const inviteWorkspaceMembersSchema = z.object({
  params: workspaceParamsSchema,
  body: z.object({
    // Do not accept an empty invitation list because there would be nothing to
    // save or queue. The shared schema above also trims each email, changes it
    // to lowercase, checks its format, and rejects the same email appearing
    // more than once in this request.
    invitations: workspaceInvitesSchema.refine(
      (invitations) => invitations.length > 0,
      "At least one invitation is required",
    ),
  }),
});

export const workspaceOverviewSchema = z.object({
  params: workspaceParamsSchema,
});

const positiveIntegerQueryValue = (label: string) =>
  z
    .string()
    .regex(/^[1-9]\d*$/, `${label} must be a positive integer`)
    .refine(
      (value) => Number.isSafeInteger(Number(value)),
      `${label} is too large`,
    );

export const workspaceMembersSchema = z.object({
  params: workspaceParamsSchema,
  query: z.object({
    page: positiveIntegerQueryValue("Page").optional(),
    pageSize: positiveIntegerQueryValue("Page size")
      .refine(
        (value) => Number(value) <= MAX_PAGE_SIZE,
        `Page size cannot exceed ${MAX_PAGE_SIZE}`,
      )
      .optional(),
  }),
});

const workspaceMemberParamsSchema = workspaceParamsSchema.extend({
  memberId: z
    .string()
    .regex(/^[1-9]\d*$/, "Member ID must be a positive integer")
    .refine(
      (memberId) => Number.isSafeInteger(Number(memberId)),
      "Member ID is too large",
    ),
});

export const removeWorkspaceMemberSchema = z.object({
  params: workspaceMemberParamsSchema,
});

export const updateWorkspaceMemberRoleSchema = z.object({
  params: workspaceMemberParamsSchema,
  body: z.object({ role: workspaceRoleSchema }).strict(),
});

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceSchema>["body"];
export type AcceptWorkspaceInvitationBody = z.infer<
  typeof acceptWorkspaceInvitationSchema
>["body"];
export type InviteWorkspaceMembersBody = z.infer<
  typeof inviteWorkspaceMembersSchema
>["body"];
export type WorkspaceParams = z.infer<
  typeof workspaceParamsSchema
>;
export type WorkspaceOverviewParams = z.infer<
  typeof workspaceOverviewSchema
>["params"];
export type WorkspaceMembersQuery = z.infer<
  typeof workspaceMembersSchema
>["query"];
export type RemoveWorkspaceMemberParams = z.infer<
  typeof removeWorkspaceMemberSchema
>["params"];
export type UpdateWorkspaceMemberRoleParams = z.infer<
  typeof updateWorkspaceMemberRoleSchema
>["params"];
export type UpdateWorkspaceMemberRoleBody = z.infer<
  typeof updateWorkspaceMemberRoleSchema
>["body"];
