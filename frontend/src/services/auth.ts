import { apiClient } from "./api"

interface RegisterResponse {
    success: boolean;
    data?: Record<string, string>;
    error?: string;
}

interface LoginResponse {
    success: boolean;
    user: {
        id: number;
        email: string;
        firstname: string;
        lastname: string;
    };
}

export const login = async (payload: {
    email: string;
    password: string;
}): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data as LoginResponse;
}

export const getCurrentUser = async (): Promise<LoginResponse["user"]> => {
    const response = await apiClient.get('/auth/me');
    return response.data.user as LoginResponse["user"];
};

export const register = async (payload: {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
}): Promise<RegisterResponse> => {
    const response = await apiClient.post('/auth/register', payload);
    
    return response.data as RegisterResponse;
}
