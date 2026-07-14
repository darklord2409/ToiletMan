import { List, Radio, Switch } from "antd-mobile";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/PageHeader";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";
import { useCustomer, useUpdateLanguage, useUpdateProfile } from "@/hooks/useCustomer";
import { useAppTheme, type ThemeMode } from "@/theme/ThemeContext";

export default function SettingsPage() {
  const { t, i18n } = useTranslation("profile");
  const updateLanguage = useUpdateLanguage();
  const updateProfile = useUpdateProfile();
  const { data: customer } = useCustomer();
  const { mode, setMode } = useAppTheme();

  function handleLanguageChange(code: string) {
    void i18n.changeLanguage(code);
    updateLanguage.mutate(code);
  }

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: "light", label: t("settings.themeOptions.light") },
    { value: "dark", label: t("settings.themeOptions.dark") },
    { value: "auto", label: t("settings.themeOptions.auto") },
  ];

  return (
    <div className="scroll-page">
      <PageHeader title={t("settings.title")} />

      <List header={t("settings.language")}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <List.Item
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            extra={
              <Radio checked={i18n.language === lang.code} onChange={() => handleLanguageChange(lang.code)} />
            }
          >
            {lang.flag} {lang.label}
          </List.Item>
        ))}
      </List>

      <List header={t("settings.theme")} style={{ marginTop: 12 }}>
        {themeOptions.map((option) => (
          <List.Item
            key={option.value}
            onClick={() => setMode(option.value)}
            extra={<Radio checked={mode === option.value} onChange={() => setMode(option.value)} />}
          >
            {option.label}
          </List.Item>
        ))}
      </List>

      <List header={t("settings.notifications")} style={{ marginTop: 12 }}>
        <List.Item
          extra={
            <Switch
              checked={customer?.notifications_enabled ?? true}
              onChange={(checked) => updateProfile.mutate({ notifications_enabled: checked })}
            />
          }
        >
          {t("settings.notificationsHint")}
        </List.Item>
      </List>
    </div>
  );
}
