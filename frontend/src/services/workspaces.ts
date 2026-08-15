import type { WorkspaceFormValues } from "../types/workspace";
import { apiClient } from "./api";

export interface CreateWorkspaceResponse {
  success: boolean;
  message: string;
}

export const createWorkspace = async (
  payload: WorkspaceFormValues
): Promise<CreateWorkspaceResponse> => {
  const response = await apiClient.post<CreateWorkspaceResponse>("/workspaces", payload);
  return response.data;
};
