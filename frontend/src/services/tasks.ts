import type { TaskPriority, TaskStatus } from "../components/tasks/taskTypes";
import { apiClient, type ApiSuccessResponse } from "./api";

export interface CreateTaskPayload {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  dueDate: string | null;
  timeEstimate: string | null;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload> & {
  position?: number;
};

export interface TaskMutationResult {
  id: number;
}

export interface ProjectTask {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  position?: number;
  priority: TaskPriority;
  dueDate: string | null;
  timeEstimate: string | null;
  createdAt: string;
  updatedAt: string;
  assignees: Array<{
    id: number;
    firstname: string;
    lastname: string;
    email: string;
  }>;
}

export interface ProjectTaskListData {
  tasks: ProjectTask[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface TaskHistoryEntry {
  id: number;
  action: string;
  changes: unknown;
  createdAt: string;
  actor: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
  };
}

export interface TaskHistoryData {
  history: TaskHistoryEntry[];
  nextCursor: number | null;
}

export const getProjectTasks = async (
  workspaceId: string,
  projectId: number,
): Promise<ApiSuccessResponse<ProjectTaskListData>> => {
  const response = await apiClient.get<ApiSuccessResponse<ProjectTaskListData>>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
    { params: { page: 1, pageSize: 100 } },
  );
  return response.data;
};

export const getTaskHistory = async (
  workspaceId: string,
  projectId: number,
  taskId: number,
  cursor?: number,
): Promise<ApiSuccessResponse<TaskHistoryData>> => {
  const response = await apiClient.get<ApiSuccessResponse<TaskHistoryData>>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/history`,
    { params: { limit: 25, ...(cursor ? { cursor } : {}) } },
  );
  return response.data;
};

export const createTask = async (
  workspaceId: string,
  projectId: number,
  payload: CreateTaskPayload,
): Promise<ApiSuccessResponse<TaskMutationResult>> => {
  const response = await apiClient.post<ApiSuccessResponse<TaskMutationResult>>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
    payload,
  );
  return response.data;
};

export const updateTask = async (
  workspaceId: string,
  projectId: number,
  taskId: number,
  payload: UpdateTaskPayload,
): Promise<ApiSuccessResponse<TaskMutationResult>> => {
  const response = await apiClient.patch<
    ApiSuccessResponse<TaskMutationResult>
  >(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
    payload,
  );
  return response.data;
};
