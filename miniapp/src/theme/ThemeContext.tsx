import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ConfigProvider } from "antd-mobile";
import enUS from "antd-mobile/es/locales/en-US";
import ruRU from "antd-mobile/es/locales/ru-RU";
import { useTranslation } from "react-i18next";

import { kvStorage } from "@/lib/storage";
import { useTelegramIsDark } from "@/telegram/hooks";

// antd-mobile has no Uzbek locale of its own (governs built-in chrome text
// like the Stepper's +/- accessible labels, PullToRefresh defaults, etc.)
// — English is the closest available fallback for the "uz" app language.
const ANTD_MOBILE_LOCALES = { ru: ruRU, en: enUS, uz: enUS };

export type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "tipobot_theme_mode";

function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = kvStorage.getLocal(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "auto" ? stored : "auto";
  });
  const telegramIsDark = useTelegramIsDark();
  const { i18n } = useTranslation();
  const antdMobileLocale =
    ANTD_MOBILE_LOCALES[i18n.language as keyof typeof ANTD_MOBILE_LOCALES] ?? ruRU;

  useEffect(() => {
    void kvStorage.reconcileFromCloud(STORAGE_KEY, (cloudValue) => {
      if (cloudValue === "light" || cloudValue === "dark" || cloudValue === "auto") {
        setModeState(cloudValue);
      }
    });
    // Runs once at boot — later changes are always driven by the user via
    // setMode, which already writes through to both stores.
  }, []);

  const isDark = mode === "auto" ? telegramIsDark || systemPrefersDark() : mode === "dark";

  useEffect(() => {
    document.documentElement.dataset.prefersColorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    kvStorage.setLocal(STORAGE_KEY, next);
  };

  const value = useMemo(() => ({ mode, isDark, setMode }), [mode, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider locale={antdMobileLocale}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
  return ctx;
}
