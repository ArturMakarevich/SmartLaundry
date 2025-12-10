import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/";

export const apiClient = axios.create({
  baseURL,
  withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("sl_access");
  if (token) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    } as any;
  }
  return config;
});
