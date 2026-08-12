import axios from "axios";

// DataBridge talks DIRECTLY to the real Inzira Insights backend — same database
// as the full platform. In dev, VITE_API_URL is empty and Vite proxies "/api"
// to localhost:5000. In production, set VITE_API_URL to the deployed backend.
const CONFIGURED = (import.meta.env.VITE_API_URL || "").trim();
const API_BASE = CONFIGURED.length > 0 ? CONFIGURED : "/api";

// Distinct storage keys so this app never collides with the main frontend when
// both happen to be opened on the same machine/domain.
export const TOKEN_KEY = "db_token";
export const REFRESH_KEY = "db_refresh";
export const USER_KEY = "db_user";
export const LANG_KEY = "db_lang";

const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthExpiry =
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !original?._retry;

    if (isAuthExpiry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (!refreshToken) throw new Error("no refresh token");
        // De-dupe concurrent refreshes
        refreshing =
          refreshing ||
          axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const { data } = await refreshing;
        refreshing = null;
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = "/login";
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

// Normalise an axios error into a friendly, plain-language message.
export function errorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.message === "Network Error") return "No connection. Check your internet and try again.";
  return fallback;
}

export default api;
