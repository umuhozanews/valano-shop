import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  const scheduleRefresh = useCallback((accessToken) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    // Refresh 1 minute before 15-minute expiry
    refreshTimer.current = setTimeout(async () => {
      try {
        const rt = localStorage.getItem("valano_refresh");
        if (!rt) return;
        const { data } = await api.post("/auth/refresh", { refreshToken: rt });
        localStorage.setItem("valano_token", data.accessToken);
        scheduleRefresh(data.accessToken);
      } catch {
        logout();
      }
    }, 14 * 60 * 1000);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("valano_token", data.accessToken);
    localStorage.setItem("valano_refresh", data.refreshToken);
    localStorage.setItem("valano_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("valano_token");
    localStorage.removeItem("valano_refresh");
    localStorage.removeItem("valano_user");
    setUser(null);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("valano_token");
    const stored = localStorage.getItem("valano_user");
    if (token && stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
        
        const startupRefresh = async () => {
          try {
            const rt = localStorage.getItem("valano_refresh");
            if (rt) {
              const { data } = await api.post("/auth/refresh", { refreshToken: rt });
              localStorage.setItem("valano_token", data.accessToken);
              scheduleRefresh(data.accessToken);
            } else {
              logout();
            }
          } catch {
            logout();
          }
        };
        startupRefresh();
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, [scheduleRefresh, logout]);

  const hasRole = useCallback((...roles) => user && roles.includes(user.role), [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
