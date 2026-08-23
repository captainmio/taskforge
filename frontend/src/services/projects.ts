import { apiClient, type ApiSuccessResponse } from "./api";
import type { WorkspaceProject } from "../types/workspace";

export interface CreateProjectPayload {
  projectName: string;
  description: string;
  icon:
    | "desktop"
    | "mobile"
    | "code"
    | "launch"
    | "flag"
    | "database"
    | "server"
    | "design"
    | "analytics"
    | "marketing"
    | "commerce"
    | "quality";
  status: "planning" | "active" | "on-hold" | "completed";
  startDate: string;
  dueDate: string;
  defaultView: "list" | "board" | "calendar";
}

export interface CreatedProject {
  id: number;
}

export const createProject = async (
  workspaceId: string,
  payload: CreateProjectPayload,
): Promise<ApiSuccessResponse<CreatedProject>> => {
  const response = await apiClient.post<ApiSuccessResponse<CreatedProject>>(
    `/workspaces/${workspaceId}/projects`,
    payload,
  );
  return response.data;
};

export const getProjects = async (
  workspaceId: string,
): Promise<ApiSuccessResponse<WorkspaceProject[]>> => {
  const response = await apiClient.get<ApiSuccessResponse<WorkspaceProject[]>>(
    `/workspaces/${workspaceId}/projects`,
  );
  return response.data;
};
