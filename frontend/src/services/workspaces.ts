import type { CreateWorkspacePayload } from "../types/workspace";
import { apiClient, type ApiResponse } from "./api";

// export interface CreateWorkspaceResponse {
//   success: boolean;
//   message: string;
// }

// export interface GetWorkspaceOverviewResponse {
//   success: boolean;
//   message?: string;
//   data?: Record<string, unknown>
// }

export const createWorkspace = async (
  payload: CreateWorkspacePayload
): Promise<ApiResponse> => {
  const response = await apiClient.post<ApiResponse>("/workspaces", payload);
  return response?.data;
};

export const getWorkspaceOverview = async (workspaceId: string): Promise<ApiResponse> => {
  const response = await apiClient.get<ApiResponse>(`/workspaces/${workspaceId}/overview`);
  return response?.data;
}
