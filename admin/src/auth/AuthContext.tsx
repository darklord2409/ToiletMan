import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apiClient, extractErrorMessage, setSessionExpiredHandler } from "@/api/client";
import { tokenStorage } from "@/auth/tokenStorage";
import type { AdminUser } from "@/types/entities";
import type { TokenPair } from "@/types/api";

interface AuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    async function restoreSession() {
      if (!tokenStorage.getAccessToken()) {
        setIsInitializing(false);
        return;
      }
      try {
        const { data } = await apiClient.get<AdminUser>("/auth/me");
        setUser(data);
      } catch {
        clearSession();
      } finally {
        setIsInitializing(false);
      }
    }
    void restoreSession();
  }, [clearSession]);

  const login = useCallback(async (username: string, password: string) => {
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", password);

    try {
      const { data: tokens } = await apiClient.post<TokenPair>("/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      tokenStorage.setTokens(tokens);
      const { data: me } = await apiClient.get<AdminUser>("/auth/me");
      setUser(me);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      await apiClient.post("/auth/logout", { refresh_token: refreshToken });
    } catch {
      // Best-effort revocation; clear the local session regardless.
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, isInitializing, login, logout }),
    [user, isInitializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
