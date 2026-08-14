import { apiClient } from "./api"

export const login = async (payload: {
    username: string,
    password: string
}): Promise<void> =>  {
    const response = await apiClient.post('/auth/login', payload);

    console.log(response.data)
}