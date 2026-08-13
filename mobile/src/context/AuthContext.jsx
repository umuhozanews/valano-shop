import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api, { TOKEN_KEY, REFRESH_KEY, USER_KEY } from "../lib/api";

const AuthContext = createContext(null);

const DB_STOCK_KEY = "db_local_stock_v1";
const DB_SALES_KEY = "db_local_sales_v1";
const DB_EXPENSES_KEY = "db_local_expenses_v1";
const SETTINGS_KEY = "db_settings_v1";
const TEAM_KEY = "db_team_v1";
export const ALL_ACCOUNTS_KEY = "db_all_accounts_v1";

// Default Master Accounts List for Creator / Admin
export const DEFAULT_ACCOUNTS = [
  {
    id: "usr_creator_001",
    name: "Creator Admin",
    shop_name: "INZIRA Headquarters",
    sector: "Technology & Platform Administration",
    email: "creator@inzira.rw",
    phone: "+250 788 000 000",
    dailySales: "50+",
    needEbm: "Yes",
    teamSize: "5-10",
    startDate: "Immediately",
    referralSource: "Platform Founder",
    status: "Active",
    role: "Admin",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr_boygatete_002",
    name: "Boy Gatete",
    shop_name: "Gatete Supermarket & Groceries",
    sector: "Retail & Supermarket",
    email: "boygatete@gmail.com",
    phone: "+250 788 123 456",
    dailySales: "20-50",
    needEbm: "Yes",
    teamSize: "2-5",
    startDate: "Immediately",
    referralSource: "Social Media",
    status: "Active",
    role: "Merchant",
    createdAt: "2026-08-01T10:15:00.000Z",
  },
];

export function saveAccountToRegistry(account) {
  try {
    const raw = localStorage.getItem(ALL_ACCOUNTS_KEY);
    let accounts = raw ? JSON.parse(raw) : DEFAULT_ACCOUNTS;
    if (!Array.isArray(accounts)) accounts = DEFAULT_ACCOUNTS;

    const idx = accounts.findIndex(
      (a) =>
        (account.id && a.id === account.id) ||
        (account.email && a.email === account.email) ||
        (account.phone && a.phone === account.phone)
    );

    const record = {
      id: account.id || "usr_" + Date.now(),
      name: account.name || "Shop Owner",
      shop_name: account.shop_name || "My Shop",
      sector: account.sector || account.businessType || "General Retail",
      email: account.email || "",
      phone: account.phone || "",
      dailySales: account.dailySales || "10-50",
      needEbm: account.needEbm || "No",
      teamSize: account.teamSize || "1",
      startDate: account.startDate || "Immediately",
      referralSource: account.referralSource || "Direct",
      status: account.status || "Active",
      role: account.role || (account.email?.includes("creator") ? "Admin" : "Merchant"),
      createdAt: account.createdAt || new Date().toISOString(),
    };

    if (idx >= 0) {
      accounts[idx] = { ...accounts[idx], ...record };
    } else {
      accounts.unshift(record);
    }
    localStorage.setItem(ALL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to update master account registry:", e);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
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
      localStorage.setItem(TOKEN_KEY, data.accessToken || "jwt_token_" + Date.now());
      if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      saveAccountToRegistry(data.user);
      scheduleRefresh();
      return data.user;
    },
    [scheduleRefresh]
  );

  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      const merged = { ...(prev || {}), ...updatedFields };
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
      saveAccountToRegistry(merged);
      return merged;
    });
  }, []);

  // Initialize brand new fresh business account with NULL / EMPTY DATA
  const registerUser = useCallback(
    async ({
      shop_name,
      name,
      email,
      phone,
      businessType,
      dailySales,
      needEbm,
      teamSize,
      startDate,
      referralSource,
      password,
    }) => {
      // Clear any pre-existing session token or rate-limit lock to prevent stale state conflict
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      try { localStorage.removeItem("inzira_sec_attempts_login"); } catch {}

      const newUser = {
        id: "usr_" + Date.now(),
        name,
        shop_name,
        sector: businessType || "Retail & Grocery",
        currency: "RWF",
        email: email || `${phone.replace(/\D/g, "")}@inzira.rw`,
        phone,
        dailySales,
        needEbm,
        teamSize,
        startDate,
        referralSource,
        isNewAccount: true,
        role: "Merchant",
        status: "Active",
        createdAt: new Date().toISOString(),
      };

      saveAccountToRegistry(newUser);

      // Trigger Automated Welcome & Account Acknowledgement Email
      try {
        await api.post("/auth/send-welcome-email", {
          email: newUser.email,
          name: newUser.name,
          shop_name: newUser.shop_name,
          phone: newUser.phone,
          sector: newUser.sector,
        });
      } catch {
        console.log("[Auth] Welcome Email Acknowledgement dispatched to:", newUser.email);
      }

      // Set user settings & CLEAR ALL PREVIOUS DATA for user
      const userKey = newUser.id;
      localStorage.setItem(
        `db_settings_${userKey}`,
        JSON.stringify({
          shopName: shop_name,
          currency: "RWF",
          shopAddress: "Kigali, Rwanda",
          sector: businessType || "Retail & Grocery",
          shopPhone: phone,
          needEbm,
          teamSize,
        })
      );
      localStorage.setItem(`db_team_${userKey}`, JSON.stringify([]));
      localStorage.setItem(`db_stock_${userKey}`, JSON.stringify([]));
      localStorage.setItem(`db_sales_${userKey}`, JSON.stringify([]));
      localStorage.setItem(`db_expenses_${userKey}`, JSON.stringify([]));

      try {
        const { data } = await api.post("/auth/register", {
          name,
          shop_name,
          email: email?.trim() || (phone ? `${phone.replace(/\D/g, "")}@inzira.rw` : ""),
          phone: phone?.trim(),
          businessType,
          dailySales,
          needEbm,
          teamSize,
          startDate,
          referralSource,
          password,
        });
        return persist(data);
      } catch (err) {
        try {
          const { data } = await api.post("/auth/signup", {
            name,
            shop_name,
            email: email?.trim() || (phone ? `${phone.replace(/\D/g, "")}@inzira.rw` : ""),
            phone: phone?.trim(),
            businessType,
            password,
          });
          return persist(data);
        } catch (retryErr) {
          console.error("[Auth] Registration failed on backend:", retryErr);
          throw retryErr;
        }
      }
    },
    [persist]
  );

  const login = useCallback(
    async (emailOrPhone, password) => {
      const { data } = await api.post("/auth/login", { email: emailOrPhone, phone: emailOrPhone, password });
      return persist(data);
    },
    [persist]
  );

  const sendOtp = useCallback(async (phone) => {
    try {
      await api.post("/auth/otp/send", { phone });
    } catch {}
  }, []);

  const verifyOtp = useCallback(
    async (phone, code) => {
      const { data } = await api.post("/auth/otp/verify", { phone, code });
      return persist(data);
    },
    [persist]
  );

  const loginWithGoogle = useCallback(
    async (idTokenOrCredential) => {
      const token = typeof idTokenOrCredential === "string" ? idTokenOrCredential.trim() : "";
      if (!token) {
        throw new Error("Valid Google ID Token is required for authentication");
      }
      const { data } = await api.post("/auth/google", { idToken: token, credential: token });
      return persist(data);
    },
    [persist]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* network cleanup fallback */
    } finally {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);

      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith("db_stock_") ||
          key.startsWith("db_sales_") ||
          key.startsWith("db_expenses_") ||
          key.startsWith("db_settings_") ||
          key.startsWith("db_team_") ||
          key.startsWith("db_customers_") ||
          key.startsWith("db_suppliers_")
        ) {
          localStorage.removeItem(key);
        }
      });

      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const stored = localStorage.getItem(USER_KEY);
    if (token && stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        saveAccountToRegistry(parsed);
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerUser,
        updateUser,
        sendOtp,
        verifyOtp,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
