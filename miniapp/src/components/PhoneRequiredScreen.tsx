import { useState } from "react";
import { Button, Form, Input, Toast } from "antd-mobile";
import { useTranslation } from "react-i18next";

import { extractErrorMessage } from "@/api/client";
import { useUpdateProfile } from "@/hooks/useCustomer";
import { usePublicStoreSettings } from "@/hooks/useSettings";
import { isPhoneRequestAvailable, requestUserPhone } from "@/telegram/sdk";

interface ManualFormValues {
  phone: string;
}

// Blocking screen: the store needs a real phone number for every customer
// (order contact, delivery coordination), and Telegram never puts it in
// initData for privacy reasons — the only way to get it is this explicit
// native "share your contact?" prompt (or, if that's unavailable on the
// client, manual entry below). Rendered in place of the whole app until the
// number is saved, so there is no way to browse/order without one.
export function PhoneRequiredScreen() {
  const { t } = useTranslation("auth");
  const { data: settings } = usePublicStoreSettings();
  const updateProfile = useUpdateProfile();
  const [form] = Form.useForm<ManualFormValues>();
  const [requesting, setRequesting] = useState(false);
  const nativeAvailable = isPhoneRequestAvailable();

  async function handleShare() {
    setRequesting(true);
    try {
      const phone = await requestUserPhone();
      if (!phone) {
        Toast.show({ content: t("declined") });
        return;
      }
      await updateProfile.mutateAsync({ phone });
    } catch (error) {
      Toast.show({ content: extractErrorMessage(error) });
    } finally {
      setRequesting(false);
    }
  }

  function handleManualSubmit(values: ManualFormValues) {
    updateProfile.mutate(
      { phone: values.phone },
      { onError: (error) => Toast.show({ content: extractErrorMessage(error) }) },
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "24px 20px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        {settings?.logo_url ? (
          <img
            src={settings.logo_url}
            alt={settings.store_name}
            style={{ height: 44, maxWidth: "100%", objectFit: "contain", margin: "0 0 16px" }}
          />
        ) : null}
        <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>{t("title")}</h2>
        <p style={{ margin: 0, color: "var(--adm-color-text-secondary)", fontSize: 14 }}>
          {t("description")}
        </p>
      </div>

      {nativeAvailable && (
        <>
          <Button block color="primary" size="large" loading={requesting} onClick={handleShare}>
            {t("shareButton")}
          </Button>
          <div style={{ textAlign: "center", margin: "16px 0", color: "var(--adm-color-text-secondary)" }}>
            {t("orDivider")}
          </div>
        </>
      )}

      <Form
        form={form}
        onFinish={handleManualSubmit}
        footer={
          <Button block color="primary" fill={nativeAvailable ? "outline" : "solid"} type="submit" loading={updateProfile.isPending}>
            {t("manualSubmit")}
          </Button>
        }
      >
        <Form.Item name="phone" label={t("manualLabel")} rules={[{ required: true, message: t("manualRequired") }]}>
          <Input placeholder={t("manualPlaceholder")} type="tel" />
        </Form.Item>
      </Form>
    </div>
  );
}
