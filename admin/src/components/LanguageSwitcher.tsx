import { useState } from "react";
import { Select } from "antd";
import { useTranslation } from "react-i18next";

import { apiClient } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation("common");
  const { isAuthenticated } = useAuth();
  const [updating, setUpdating] = useState(false);

  async function handleChange(code: string) {
    await i18n.changeLanguage(code);
    if (isAuthenticated) {
      setUpdating(true);
      try {
        await apiClient.patch("/auth/me/language", { language: code });
      } catch {
        // best-effort sync; the UI language has already switched locally
      } finally {
        setUpdating(false);
      }
    }
  }

  return (
    <Select
      value={i18n.language}
      onChange={handleChange}
      loading={updating}
      variant="borderless"
      style={{ width: 140 }}
      aria-label={t("ariaChangeLanguage")}
      options={SUPPORTED_LANGUAGES.map((lang) => ({
        value: lang.code,
        label: (
          <span>
            {lang.flag} {lang.label}
          </span>
        ),
      }))}
    />
  );
}
