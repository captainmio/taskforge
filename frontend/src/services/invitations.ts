import type { WorkspaceRole } from "../types/roles";
import { apiClient, type ApiSuccessResponse } from "./api";

export interface AcceptInvitationResponse {
  success: boolean;
  message: string;
  workspace: {
    id: number;
    displayName: string;
  };
}

export const acceptWorkspaceInvitation = async (
  token: string,
): Promise<AcceptInvitationResponse> => {
  const response = await apiClient.post<AcceptInvitationResponse>(
    "/workspaces/invitations/accept",
    { token },
  );

  return response.data;
};

export const acceptWorkspaceInviteLink = async (
  token: string,
): Promise<AcceptInvitationResponse> => {
  const response = await apiClient.post<AcceptInvitationResponse>(
    "/workspaces/invitation-links/accept",
    { token },
  );

  return response.data;
};

export interface InviteWorkspaceMembersPayload {
  invitations: Array<{
    email: string;
    role: WorkspaceRole;
  }>;
}

export type InviteWorkspaceMembersResponse = ApiSuccessResponse<{
  invitationCount: number;
}>;

export const inviteWorkspaceMembers = async (
  workspaceId: string,
  payload: InviteWorkspaceMembersPayload,
): Promise<InviteWorkspaceMembersResponse> => {
  const response = await apiClient.post<InviteWorkspaceMembersResponse>(
    `/workspaces/${workspaceId}/invitations`,
    payload,
  );

  return response.data;
};

export type GenerateWorkspaceInviteLinkResponse = ApiSuccessResponse<{
  invitationLink: string;
  expiresAt: string;
}>;

export const generateWorkspaceInviteLink = async (
  workspaceId: string,
): Promise<GenerateWorkspaceInviteLinkResponse> => {
  const response = await apiClient.post<GenerateWorkspaceInviteLinkResponse>(
    `/workspaces/${workspaceId}/invitation-link`,
  );

  return response.data;
};
