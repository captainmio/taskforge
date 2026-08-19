import type {
  CreateWorkspacePayload,
  WorkspaceMember,
} from "../types/workspace";
import { apiClient, type ApiSuccessResponse } from "./api";

interface CreateWorkspaceResponse {
  success: true;
  message: string;
}

export const createWorkspace = async (
  payload: CreateWorkspacePayload
): Promise<CreateWorkspaceResponse> => {
  // Workspace creation currently returns a message without the global `data`
  // field, so its response is intentionally typed separately.
  const response = await apiClient.post<CreateWorkspaceResponse>(
    "/workspaces",
    payload,
  );
  return response.data;
};

export const getWorkspaceOverview = async (
  workspaceId: string,
): Promise<ApiSuccessResponse<WorkspaceMember[]>> => {
  const response = await apiClient.get<ApiSuccessResponse<WorkspaceMember[]>>(
    `/workspaces/${workspaceId}/overview`,
  );
  return response.data;
};
