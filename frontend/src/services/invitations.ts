import { apiClient } from "./api";

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
