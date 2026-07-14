import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { getMe, loginWithTelegram, logout as logoutRequest } from "@/api/customerAuth";
import { setSessionExpiredHandler } from "@/api/client";
import { tokenStorage } from "@/auth/tokenStorage";
import { bootTelegramSdk, getRawInitData } from "@/telegram/sdk";
import type { CustomerRead } from "@/types/entities";

export type AuthStatus = "initializing" | "authenticated" | "guest";

interface AuthContextValue {
  customer: CustomerRead | null;
  status: AuthStatus;
  isTelegram: boolean;
  setCustomer: (customer: CustomerRead) => void;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomerState] = useState<CustomerRead | null>(null);
  const [status, setStatus] = useState<AuthStatus>("initializing");
  const [isTelegram, setIsTelegram] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setCustomerState(null);
    setStatus("guest");
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus("initializing");
      const { isTelegram: telegram } = await bootTelegramSdk();
      if (cancelled) return;
      setIsTelegram(telegram);

      // A token already on this device (previous session, or seeded by
      // e2e test setup) always wins — no need to re-run the Telegram
      // handshake every launch.
      if (tokenStorage.getAccessToken()) {
        try {
          const me = await getMe();
          if (cancelled) return;
          setCustomerState(me);
          setStatus("authenticated");
          return;
        } catch {
          tokenStorage.clear();
        }
      }

      if (telegram) {
        const rawInitData = getRawInitData();
        if (rawInitData) {
          try {
            const tokens = await loginWithTelegram(rawInitData);
            if (cancelled) return;
            tokenStorage.setTokens(tokens);
            const me = await getMe();
            if (cancelled) return;
            setCustomerState(me);
            setStatus("authenticated");
            return;
          } catch {
            // fall through to guest — invalid/expired initData, bot
            // misconfiguration, or the backend being unreachable
          }
        }
      }

      if (!cancelled) setStatus("guest");
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch {
        // best-effort revocation — clear the local session regardless
      }
    }
    clearSession();
  }, [clearSession]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo(
    () => ({
      customer,
      status,
      isTelegram,
      setCustomer: setCustomerState,
      logout,
      retry,
    }),
    [customer, status, isTelegram, logout, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
