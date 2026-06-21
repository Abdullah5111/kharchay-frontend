import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8020/api",
});

let accessToken: string | null = null;
export function setAccessToken(t: string | null) {
  accessToken = t;
}

// The auth layer registers this (keeps api.ts free of an auth-import cycle).
// It renews the access token via /auth/refresh/ and returns the new one, or
// null if the session can't be renewed (the handler then signs the user out).
type RefreshHandler = () => Promise<string | null>;
let refreshHandler: RefreshHandler | null = null;
export function setRefreshHandler(fn: RefreshHandler | null) {
  refreshHandler = fn;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// De-dupe concurrent refreshes so a burst of 401s triggers a single refresh.
let inflightRefresh: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;
    const url = original?.url ?? "";
    const isAuthCall = url.includes("/auth/refresh") || url.includes("/auth/verify-otp");

    if (status === 401 && original && !original._retry && refreshHandler && !isAuthCall) {
      original._retry = true;
      if (!inflightRefresh) {
        inflightRefresh = refreshHandler().finally(() => {
          inflightRefresh = null;
        });
      }
      const newToken = await inflightRefresh;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);
