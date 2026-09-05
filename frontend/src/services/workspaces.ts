import type {
  CreateWorkspacePayload,
  WorkspaceMember,
  WorkspaceOverview,
  WorkspaceRecentUpdate,
  WorkspaceUpcomingTask,
} from "../types/workspace";
import type { WorkspaceMemberRole, WorkspaceRole } from "../types/roles";
import { apiClient, type ApiSuccessResponse } from "./api";

interface CreateWorkspaceResponse {
  success: true;
  message: string;
}

export const createWorkspace = async (
  payload: CreateWorkspacePayload,
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
): Promise<ApiSuccessResponse<WorkspaceOverview>> => {
  const response = await apiClient.get<ApiSuccessResponse<WorkspaceOverview>>(
    `/workspaces/${workspaceId}/overview`,
  );
  return response.data;
};

export const getWorkspaceHistory = async (
  workspaceId: string,
  cursor?: number,
) => {
  const response = await apiClient.get<
    ApiSuccessResponse<{
      history: WorkspaceRecentUpdate[];
      nextCursor: number | null;
    }>
  >(`/workspaces/${workspaceId}/history`, {
    params: { limit: 25, ...(cursor ? { cursor } : {}) },
  });
  return response.data;
};

export interface WorkspaceUpcomingTaskListData {
  tasks: WorkspaceUpcomingTask[];
  nextCursor: number | null;
}

export const getWorkspaceUpcomingTasks = async (
  workspaceId: string,
  cursor?: number,
  sort = "due_asc",
): Promise<ApiSuccessResponse<WorkspaceUpcomingTaskListData>> => {
  const response = await apiClient.get<
    ApiSuccessResponse<WorkspaceUpcomingTaskListData>
  >(`/workspaces/${workspaceId}/upcoming-tasks`, {
    params: { limit: 5, sort, ...(cursor ? { cursor } : {}) },
  });
  return response.data;
};

export const getWorkspaceMyTasks = async (
  workspaceId: string,
  cursor?: number,
  sort = "due_asc",
): Promise<ApiSuccessResponse<WorkspaceUpcomingTaskListData>> => {
  const response = await apiClient.get<
    ApiSuccessResponse<WorkspaceUpcomingTaskListData>
  >(`/workspaces/${workspaceId}/my-tasks`, {
    params: { limit: 5, sort, ...(cursor ? { cursor } : {}) },
  });
  return response.data;
};

export interface UpdateWorkspaceMemberRolePayload {
  role: WorkspaceRole;
}

export type UpdateWorkspaceMemberRoleResponse =
  ApiSuccessResponse<WorkspaceMember>;

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

export const updateWorkspaceMemberRole = async (
  workspaceId: string,
  memberId: number,
  payload: UpdateWorkspaceMemberRolePayload,
): Promise<UpdateWorkspaceMemberRoleResponse> => {
  const response = await apiClient.patch<UpdateWorkspaceMemberRoleResponse>(
    `/workspaces/${workspaceId}/members/${memberId}`,
    payload,
  );
  return response.data;
};
