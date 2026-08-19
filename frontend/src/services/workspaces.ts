import type {
  CreateWorkspacePayload,
  WorkspaceMember,
} from "../types/workspace";
import { apiClient, type ApiResponse } from "./api";

export const createWorkspace = async (
  payload: CreateWorkspacePayload
): Promise<ApiResponse> => {
  const response = await apiClient.post<ApiResponse>("/workspaces", payload);
  return response?.data;
};

export const getWorkspaceOverview = async (
  workspaceId: string,
): Promise<ApiResponse<WorkspaceMember[]>> => {
  const response = await apiClient.get<ApiResponse<WorkspaceMember[]>>(
    `/workspaces/${workspaceId}/overview`,
  );
  return response?.data;
};
