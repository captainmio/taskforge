import { apiClient } from "./api"

export interface RegisterResponse {
    success: boolean;
    message: string;
}

export interface User {
    id: number;
    email: string;
    firstname: string;
    lastname: string;
}

export interface LoginResponse {
    success: boolean;
    user: User;
}

export interface JoinedWorkspace {
    id: number;
    name: string;
}

export interface MeResponse {
    success: boolean;
    workspaces: JoinedWorkspace[];
    user: User;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface RegisterPayload {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
}

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', payload);
    return response.data;
}

export const getCurrentUser = async (): Promise<MeResponse> => {
    const response = await apiClient.get<MeResponse>('/auth/me');
    return response.data;
};

export const logout = async (): Promise<void> => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
};

export const register = async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>('/auth/register', payload);
    
    return response.data;
}
