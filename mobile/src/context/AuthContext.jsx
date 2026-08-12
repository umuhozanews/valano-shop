import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api, { TOKEN_KEY, REFRESH_KEY, USER_KEY } from "../lib/api";

const AuthContext = createContext(null);

// DataBridge is a single-role app for the SME owner (and their staff). It reuses
// the platform's JWT auth: /auth/login (email+password) or /auth/otp/* (phone).
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    // Access tokens live 15m — refresh a minute early.
    refreshTimer.current = setTimeout(async () => {
      try {
        const rt = localStorage.getItem(REFRESH_KEY);
        if (!rt) return;
        const { data } = await api.post("/auth/refresh", { refreshToken: rt });
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        scheduleRefresh();
      } catch {
        /* interceptor handles hard expiry */
      }
    }, 14 * 60 * 1000);
  }, []);

  const persist = useCallback(
    (data) => {
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      scheduleRefresh();
      return data.user;
    },
    [scheduleRefresh]
  );

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post("/auth/login", { email, password });
      return persist(data);
    },
    [persist]
  );

  const sendOtp = useCallback(async (phone) => {
    await api.post("/auth/otp/send", { phone });
  }, []);

  const verifyOtp = useCallback(
    async (phone, code) => {
      const { data } = await api.post("/auth/otp/verify", { phone, code });
      return persist(data);
    },
    [persist]
  );

  const logout = useCallback(() => {
    api.post("/auth/logout").catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const stored = localStorage.getItem(USER_KEY);
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
        scheduleRefresh();
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [scheduleRefresh]);

  return (
    <AuthContext.Provider value={{ user, loading, login, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
