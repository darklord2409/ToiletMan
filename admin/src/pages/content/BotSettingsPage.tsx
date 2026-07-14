import { useEffect } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Skeleton,
  Space,
  Tabs,
  Typography,
} from "antd";
import { MinusCircleOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { apiClient, extractErrorMessage } from "@/api/client";
import { ImageUploadField } from "@/components/ImageUploadField";

const LOCALES = ["ru", "en", "uz"] as const;
type LocaleCode = (typeof LOCALES)[number];

const NOTIFICATION_EVENTS = [
  "order_confirmed",
  "order_processing",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
  "order_refunded",
  "manager_contacted",
  "new_order_manager_alert",
] as const;

type LocalizedText = Partial<Record<LocaleCode, string>>;

interface BotSettings {
  bot_name: string | null;
  bot_username: string | null;
  welcome_text: LocalizedText | null;
  welcome_image_url: string | null;
  menu_button_text: LocalizedText | null;
  pinned_announcement: LocalizedText | null;
  manager_telegram_ids: number[] | null;
  notification_templates: Record<string, LocalizedText> | null;
}

function emptyLocalizedText(): Record<LocaleCode, string> {
  return { ru: "", en: "", uz: "" };
}

export default function BotSettingsPage() {
  const { t } = useTranslation(["content", "common"]);
  const tp = (key: string) => t(`botSettings.${key}`, { ns: "content" });
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const settingsQuery = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data } = await apiClient.get<BotSettings>("/settings");
      return data;
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const data = settingsQuery.data;
    const templates: Record<string, Record<LocaleCode, string>> = {};
    for (const event of NOTIFICATION_EVENTS) {
      templates[event] = { ...emptyLocalizedText(), ...data.notification_templates?.[event] };
    }
    form.setFieldsValue({
      bot_name: data.bot_name,
      bot_username: data.bot_username,
      welcome_text: { ...emptyLocalizedText(), ...data.welcome_text },
      welcome_image_url: data.welcome_image_url,
      menu_button_text: { ...emptyLocalizedText(), ...data.menu_button_text },
      pinned_announcement: { ...emptyLocalizedText(), ...data.pinned_announcement },
      manager_telegram_ids: data.manager_telegram_ids ?? [],
      notification_templates: templates,
    });
  }, [settingsQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.patch<BotSettings>("/settings", payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["store-settings"], data);
      message.success(t("common:updateSuccess", { entity: tp("title") }));
    },
    onError: (err) => message.error(extractErrorMessage(err)),
  });

  function stripEmpty(localized: Record<string, string> | undefined): LocalizedText | null {
    if (!localized) return null;
    const result: LocalizedText = {};
    for (const locale of LOCALES) {
      if (localized[locale]?.trim()) result[locale] = localized[locale];
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  async function handleSave() {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const rawTemplates = values.notification_templates as
      | Record<string, Record<string, string>>
      | undefined;
    const notification_templates: Record<string, LocalizedText> = {};
    for (const event of NOTIFICATION_EVENTS) {
      const stripped = stripEmpty(rawTemplates?.[event]);
      if (stripped) notification_templates[event] = stripped;
    }

    updateMutation.mutate({
      bot_name: values.bot_name || null,
      // bot_username is disabled/read-only in this form (see help text) —
      // Telegram only lets a bot change its own @username via BotFather, so
      // it's excluded from the payload and instead kept in sync server-side
      // (StoreSettingsService.update refreshes it from Telegram's own
      // getMe() every time bot_name is pushed).
      welcome_text: stripEmpty(values.welcome_text as Record<string, string>),
      welcome_image_url: values.welcome_image_url || null,
      menu_button_text: stripEmpty(values.menu_button_text as Record<string, string>),
      pinned_announcement: stripEmpty(values.pinned_announcement as Record<string, string>),
      manager_telegram_ids: (values.manager_telegram_ids as (number | null)[] | undefined)?.filter(
        (id): id is number => typeof id === "number",
      ),
      notification_templates:
        Object.keys(notification_templates).length > 0 ? notification_templates : null,
    });
  }

  if (settingsQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {tp("title")}
          </Typography.Title>
          <Typography.Text type="secondary">{tp("description")}</Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={updateMutation.isPending}
          onClick={handleSave}
        >
          {t("common:save")}
        </Button>
      </div>

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card title={tp("sections.general")} style={{ marginBottom: 16 }}>
              <Form.Item name="bot_name" label={tp("fields.botName")} help={tp("fields.botNameHelp")}>
                <Input />
              </Form.Item>
              <Form.Item name="bot_username" label={tp("fields.botUsername")} help={tp("fields.botUsernameHelp")}>
                <Input addonBefore="@" disabled />
              </Form.Item>
            </Card>

            <Card title={tp("sections.welcome")} style={{ marginBottom: 16 }}>
              <Form.Item name="welcome_image_url" label={tp("fields.welcomeImageUrl")}>
                <ImageUploadField />
              </Form.Item>
              <Typography.Text strong>{tp("fields.welcomeText")}</Typography.Text>
              <Tabs
                size="small"
                items={LOCALES.map((locale) => ({
                  key: locale,
                  label: t(`botSettings.locales.${locale}`, { ns: "content" }),
                  children: (
                    <Form.Item name={["welcome_text", locale]} noStyle>
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  ),
                }))}
              />
            </Card>

            <Card title={tp("sections.menuButton")} style={{ marginBottom: 16 }}>
              <Tabs
                size="small"
                items={LOCALES.map((locale) => ({
                  key: locale,
                  label: t(`botSettings.locales.${locale}`, { ns: "content" }),
                  children: (
                    <Form.Item name={["menu_button_text", locale]} noStyle>
                      <Input maxLength={16} showCount />
                    </Form.Item>
                  ),
                }))}
              />
            </Card>

            <Card title={tp("sections.announcement")} style={{ marginBottom: 16 }}>
              <Tabs
                size="small"
                items={LOCALES.map((locale) => ({
                  key: locale,
                  label: t(`botSettings.locales.${locale}`, { ns: "content" }),
                  children: (
                    <Form.Item name={["pinned_announcement", locale]} noStyle>
                      <Input.TextArea rows={2} />
                    </Form.Item>
                  ),
                }))}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title={tp("sections.managers")} style={{ marginBottom: 16 }}>
              <Typography.Text type="secondary">{tp("managerIdsHelp")}</Typography.Text>
              <Form.List name="manager_telegram_ids">
                {(fields, { add, remove }) => (
                  <div style={{ marginTop: 12 }}>
                    {fields.map((field) => (
                      <Space key={field.key} style={{ display: "flex", marginBottom: 8 }}>
                        <Form.Item {...field} noStyle>
                          <InputNumber style={{ width: 220 }} placeholder="123456789" />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(field.name)} />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                      {tp("addManagerId")}
                    </Button>
                  </div>
                )}
              </Form.List>
            </Card>

            <Card title={tp("sections.templates")}>
              <Typography.Text type="secondary">{tp("templatesHelp")}</Typography.Text>
              <Tabs
                style={{ marginTop: 12 }}
                items={LOCALES.map((locale) => ({
                  key: locale,
                  label: t(`botSettings.locales.${locale}`, { ns: "content" }),
                  children: (
                    <>
                      {NOTIFICATION_EVENTS.map((event) => (
                        <Form.Item
                          key={event}
                          name={["notification_templates", event, locale]}
                          label={tp(`events.${event}`)}
                        >
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      ))}
                    </>
                  ),
                }))}
              />
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
