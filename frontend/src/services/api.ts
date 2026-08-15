import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "react-toastify";

interface ApiErrorResponse {
  error?: string;
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}


const api: string = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: api,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  //TODO: will replace to cookie based storage
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryConfig;

    if (!error.response) {
      toast.error("Unable to connect to the server.");
      return Promise.reject(error);
    }

    const status = error.response.status;

    // Token expired / unauthorized
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${api}/auth/refresh`,
          {},
          {
            withCredentials: true,
          }
        );

        const newAccessToken = response.data.accessToken;

        localStorage.setItem("accessToken", newAccessToken);

        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");

        window.location.href = "/";

        return Promise.reject(refreshError);
      }
    }


    // Normal backend error
    const message =
      error.response.data?.error ??
      "Something went wrong.";

    toast.error(message);

    return Promise.reject(error);
  }
);

export default api;