import type {
  CreateWorkspaceInvite,
  CreateWorkspacePayload,
  WorkspaceFormValues,
  WorkspaceInviteFormValues,
} from "../../../types/workspace";

const isCompleteInvite = (
  invite: WorkspaceInviteFormValues,
): invite is CreateWorkspaceInvite =>
  invite.email.trim().length > 0 && invite.role !== "";

export const getCompleteWorkspaceInvites = (
  invites: WorkspaceInviteFormValues[],
): CreateWorkspaceInvite[] =>
  invites.filter(isCompleteInvite).map((invite) => ({
    email: invite.email.trim().toLowerCase(),
    role: invite.role,
  }));

export const createWorkspacePayload = (
  values: WorkspaceFormValues,
): CreateWorkspacePayload => ({
  workspaceName: values.workspaceName.trim(),
  description: values.description.trim(),
  icon: values.icon,
  invites: getCompleteWorkspaceInvites(values.invites),
});
