import axios, { AxiosError } from "axios";
import { toast } from "react-toastify";

interface ApiErrorResponse {
  error?: string;
}

const api: string = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: api,
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    if (!error.response) {
      toast.error("Unable to connect to the server.");
      return Promise.reject(error);
    }

    const isAuthCheck = error.config?.url?.endsWith("/auth/me");
    if (!isAuthCheck) {
      toast.error(error.response.data?.error ?? "Something went wrong.");
    }
    return Promise.reject(error);
  }
);

export default api;
