import axios from "axios";

const api: string = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: api,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});