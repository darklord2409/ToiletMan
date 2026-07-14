import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import enUS from "antd/locale/en_US";
import ruRU from "antd/locale/ru_RU";
import uzUZ from "antd/locale/uz_UZ";
import { useTranslation } from "react-i18next";

const ANTD_LOCALES = { ru: ruRU, en: enUS, uz: uzUZ };

interface ThemeContextValue {
  isDark: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "tipobot_theme_dark";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");
  const { i18n } = useTranslation();
  const antdLocale = ANTD_LOCALES[i18n.language as keyof typeof ANTD_LOCALES] ?? ruRU;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isDark ? "1" : "0");
  }, [isDark]);

  const value = useMemo(
    () => ({ isDark, toggleDark: () => setIsDark((prev) => !prev) }),
    [isDark],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        locale={antdLocale}
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: "#2563eb",
            borderRadius: 6,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
  return ctx;
}
