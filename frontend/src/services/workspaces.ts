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
  page?: number;
  pageSize?: number;
}

export interface WorkspaceMemberListData {
  members: WorkspaceMember[];
  currentUserRole: WorkspaceMemberRole;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const getWorkspaceMembers = async (
  workspaceId: string,
  query: WorkspaceMemberListQuery,
): Promise<ApiSuccessResponse<WorkspaceMemberListData>> => {
  const response = await apiClient.get<
    ApiSuccessResponse<WorkspaceMemberListData>
  >(`/workspaces/${workspaceId}/members`, { params: query });
  return response.data;
};

export type RemoveWorkspaceMemberResponse = ApiSuccessResponse<{
  memberId: number;
}>;

export const removeWorkspaceMember = async (
  workspaceId: string,
  memberId: number,
): Promise<RemoveWorkspaceMemberResponse> => {
  const response = await apiClient.delete<RemoveWorkspaceMemberResponse>(
    `/workspaces/${workspaceId}/members/${memberId}`,
  );
  return response.data;
};

/*
 * Role updates remain documented until that backend route is implemented. The
 * page keeps its temporary role-update log so the modal flow can still be
 * verified without sending a request that returns 404.
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
 */
