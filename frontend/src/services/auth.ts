import { apiClient } from "./api"

interface apiResponse {
    success: boolean; 
    data?: Record<string, string>; 
    error?: string
}

export const login = async (payload: {
    email: string,
    password: string
}): Promise<void> => {
    const response = await apiClient.post('/auth/login', payload);

    console.log(response.data)
}

export const register = async (payload: {
    firstname: string,
    lastname: string,
    email: string,
    password: string
}): Promise<apiResponse> => {
    const response = await apiClient.post('/auth/register', payload);

    return {
        success: response.data.success ?? false,
        data: response.data ?? {},
        error: response.data.error ?? '' 
    }
}