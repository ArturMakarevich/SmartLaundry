import axios, { AxiosError, AxiosRequestConfig } from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/";

export const apiClient = axios.create({
  baseURL,
  withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("sl_access");
  if (token) {
    (config.headers as any) = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;
  const refresh = window.localStorage.getItem("sl_refresh");
  if (!refresh) return null;
  refreshPromise = axios
    .post(
      `${baseURL}accounts/token/refresh/`,
      { refresh },
      { withCredentials: false }
    )
    .then(res => {
      const newAccess = res.data?.access as string | undefined;
      if (newAccess) {
        window.localStorage.setItem("sl_access", newAccess);
        return newAccess;
      }
      return null;
    })
    .catch(() => {
      window.localStorage.removeItem("sl_access");
      window.localStorage.removeItem("sl_refresh");
      window.localStorage.removeItem("sl_user_id");
      window.localStorage.removeItem("sl_user_email");
      window.localStorage.removeItem("sl_user_role");
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error?.response?.status;
    if (status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const newAccess = await refreshAccessToken();
      if (newAccess && originalRequest.headers) {
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccess}`,
        };
      } else if (newAccess) {
        originalRequest.headers = { Authorization: `Bearer ${newAccess}` };
      }
      if (newAccess) {
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);
