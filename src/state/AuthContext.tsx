import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken, type Account, type AuthResponse } from "../lib/api";

type AuthContextValue = {
  account: Account | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Account>;
  register: (name: string, email: string, password: string) => Promise<Account>;
  logout: () => void;
  refresh: () => Promise<Account | null>;
  setAccount: (account: Account | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setAccount(null);
      setLoading(false);
      return null;
    }
    try {
      const next = await api<Account>("/me");
      setAccount(next);
      setLoading(false);
      return next;
    } catch {
      setToken(null);
      setAccount(null);
      setLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    setAccount(res);
    return res;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setToken(res.token);
    setAccount(res);
    return res;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAccount(null);
  }, []);

  const value = useMemo(
    () => ({ account, loading, login, register, logout, refresh, setAccount }),
    [account, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
