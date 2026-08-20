import type {
  CreateWorkspacePayload,
  WorkspaceMember,
} from "../types/workspace";
import type { WorkspaceMemberRole, WorkspaceRole } from "../types/roles";
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

export interface UpdateWorkspaceMemberRolePayload {
  role: WorkspaceRole;
}

export interface WorkspaceMemberListQuery {
  search?: string;
  role?: WorkspaceMemberRole;
  sortBy?: "name" | "joinedAt" | "role";
  sortDirection?: "ascending" | "descending";
  page?: number;
  pageSize?: number;
}

export interface WorkspaceMemberListData {
  members: WorkspaceMember[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/*
 * These service calls document the frontend contract planned for member
 * management. Keep them commented until the backend routes are implemented;
 * the member page logs the same workspace ID, member ID, and payload values so
 * the UI flow can be verified without sending a request that would return 404.
 *
 * export const getWorkspaceMembers = async (
 *   workspaceId: string,
 *   query: WorkspaceMemberListQuery,
 * ): Promise<ApiSuccessResponse<WorkspaceMemberListData>> => {
 *   const response = await apiClient.get<
 *     ApiSuccessResponse<WorkspaceMemberListData>
 *   >(`/workspaces/${workspaceId}/members`, { params: query });
 *   return response.data;
 * };
 *
 * export const updateWorkspaceMemberRole = async (
 *   workspaceId: string,
 *   memberId: number,
 *   payload: UpdateWorkspaceMemberRolePayload,
 * ): Promise<ApiSuccessResponse<WorkspaceMember>> => {
 *   const response = await apiClient.patch<ApiSuccessResponse<WorkspaceMember>>(
 *     `/workspaces/${workspaceId}/members/${memberId}`,
 *     payload,
 *   );
 *   return response.data;
 * };
 *
 * export const removeWorkspaceMember = async (
 *   workspaceId: string,
 *   memberId: number,
 * ): Promise<ApiSuccessResponse<{ memberId: number }>> => {
 *   const response = await apiClient.delete<
 *     ApiSuccessResponse<{ memberId: number }>
 *   >(`/workspaces/${workspaceId}/members/${memberId}`);
 *   return response.data;
 * };
 */
