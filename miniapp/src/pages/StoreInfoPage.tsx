import { List, SpinLoading } from "antd-mobile";
import {
  EnvironmentOutline,
  GlobalOutline,
  PhoneFill,
  SendOutline,
} from "antd-mobile-icons";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/PageHeader";
import { usePublicStoreSettings } from "@/hooks/useSettings";

export default function StoreInfoPage() {
  const { t, i18n } = useTranslation("profile");
  const { data: settings, isLoading } = usePublicStoreSettings();
  const aboutText = settings?.about_text?.[i18n.language] ?? settings?.about_text?.ru;

  return (
    <div className="scroll-page">
      <PageHeader title={t("store.title")} />

      {isLoading || !settings ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <SpinLoading />
        </div>
      ) : (
        <>
          <div style={{ padding: 16, textAlign: "center" }}>
            {settings.logo_url && (
              <img
                src={settings.logo_url}
                alt={settings.store_name}
                style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover", marginBottom: 8 }}
              />
            )}
            <h2 style={{ margin: 0 }}>{settings.store_name}</h2>
          </div>

          {aboutText && (
            <p style={{ padding: "0 16px", fontSize: 14, color: "var(--adm-color-weak)", whiteSpace: "pre-line" }}>
              {aboutText}
            </p>
          )}

          <List>
            {settings.address && (
              <List.Item prefix={<EnvironmentOutline />}>{settings.address}</List.Item>
            )}
            {settings.phone && (
              <List.Item prefix={<PhoneFill />}>
                <a href={`tel:${settings.phone}`}>{settings.phone}</a>
              </List.Item>
            )}
            {settings.support_phone && (
              <List.Item prefix={<PhoneFill />} description={t("store.supportPhone")}>
                <a href={`tel:${settings.support_phone}`}>{settings.support_phone}</a>
              </List.Item>
            )}
            {settings.delivery_info && (
              <List.Item prefix={<GlobalOutline />} description={settings.delivery_info}>
                {t("store.delivery")}
              </List.Item>
            )}
            {settings.telegram_url && (
              <List.Item prefix={<SendOutline />}>
                <a href={settings.telegram_url} target="_blank" rel="noreferrer">
                  {t("store.telegram")}
                </a>
              </List.Item>
            )}
            {settings.whatsapp_url && (
              <List.Item prefix={<SendOutline />}>
                <a href={settings.whatsapp_url} target="_blank" rel="noreferrer">
                  {t("store.whatsapp")}
                </a>
              </List.Item>
            )}
            {settings.instagram_url && (
              <List.Item prefix={<SendOutline />}>
                <a href={settings.instagram_url} target="_blank" rel="noreferrer">
                  {t("store.instagram")}
                </a>
              </List.Item>
            )}
          </List>
        </>
      )}
    </div>
  );
}
