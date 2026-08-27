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

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export interface TaskMutationResult {
  id: number;
}

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
  const response = await apiClient.patch<ApiSuccessResponse<TaskMutationResult>>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
    payload,
  );
  return response.data;
};
