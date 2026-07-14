import { useEffect } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Skeleton,
  Space,
  Switch,
  Tabs,
  TimePicker,
  Typography,
} from "antd";
import type { FormInstance } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import dayjs, { type Dayjs } from "dayjs";

import { apiClient, extractErrorMessage } from "@/api/client";
import { ImageUploadField } from "@/components/ImageUploadField";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n/languages";

interface WorkingHoursDay {
  closed: boolean;
  open: string;
  close: string;
}
type WorkingHours = Record<string, WorkingHoursDay>;
type LocalizedText = Partial<Record<LanguageCode, string>>;

function emptyLocalizedText(): Record<LanguageCode, string> {
  return { ru: "", en: "", uz: "" };
}

interface StoreSettings {
  store_name: string;
  logo_url: string | null;
  phone: string | null;
  telegram_url: string | null;
  whatsapp_url: string | null;
  instagram_url: string | null;
  address: string | null;
  working_hours: WorkingHours | null;
  delivery_info: string | null;
  about_text: LocalizedText | null;
  currency: string;
  default_language: string;
  support_email: string | null;
  support_phone: string | null;
  tax_rate: string | number;
  tax_included: boolean;
}

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const CURRENCY_OPTIONS = [
  { label: "UZS — Uzbekistani Som", value: "UZS" },
  { label: "USD — US Dollar", value: "USD" },
  { label: "EUR — Euro", value: "EUR" },
  { label: "RUB — Russian Ruble", value: "RUB" },
];

interface WorkingHoursRowProps {
  form: FormInstance;
  day: (typeof WEEKDAYS)[number];
  label: string;
  closedLabel: string;
  openLabel: string;
}

function WorkingHoursRow({ form, day, label, closedLabel, openLabel }: WorkingHoursRowProps) {
  const closed = Form.useWatch(["working_hours", day, "closed"], form) as boolean | undefined;
  return (
    <Form.Item label={label} style={{ marginBottom: 8 }}>
      <Space>
        <Form.Item name={["working_hours", day, "closed"]} valuePropName="checked" noStyle>
          <Switch checkedChildren={closedLabel} unCheckedChildren={openLabel} />
        </Form.Item>
        <Form.Item name={["working_hours", day, "range"]} noStyle>
          <TimePicker.RangePicker format="HH:mm" disabled={closed} />
        </Form.Item>
      </Space>
    </Form.Item>
  );
}

export default function StoreSettingsPage() {
  const { t } = useTranslation(["content", "common"]);
  const tp = (key: string) => t(`storeSettings.${key}`, { ns: "content" });
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const settingsQuery = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data } = await apiClient.get<StoreSettings>("/settings");
      return data;
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const wh = settingsQuery.data.working_hours ?? {};
    const workingHoursForm: Record<string, unknown> = {};
    for (const day of WEEKDAYS) {
      const d = wh[day];
      workingHoursForm[day] = {
        closed: d?.closed ?? false,
        range: d && !d.closed && d.open && d.close ? [dayjs(d.open, "HH:mm"), dayjs(d.close, "HH:mm")] : undefined,
      };
    }
    form.setFieldsValue({
      ...settingsQuery.data,
      working_hours: workingHoursForm,
      about_text: { ...emptyLocalizedText(), ...settingsQuery.data.about_text },
    });
  }, [settingsQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.patch<StoreSettings>("/settings", payload);
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
    for (const { code } of SUPPORTED_LANGUAGES) {
      if (localized[code]?.trim()) result[code] = localized[code];
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
    const workingHoursValue = values.working_hours as Record<
      string,
      { closed: boolean; range?: [Dayjs, Dayjs] }
    >;
    const working_hours: WorkingHours = {};
    for (const day of WEEKDAYS) {
      const d = workingHoursValue[day];
      working_hours[day] = {
        closed: d.closed,
        open: d.range ? d.range[0].format("HH:mm") : "",
        close: d.range ? d.range[1].format("HH:mm") : "",
      };
    }
    updateMutation.mutate({
      ...values,
      working_hours,
      about_text: stripEmpty(values.about_text as Record<string, string>),
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
        <Button type="primary" icon={<SaveOutlined />} loading={updateMutation.isPending} onClick={handleSave}>
          {t("common:save")}
        </Button>
      </div>

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card title={tp("sections.general")} style={{ marginBottom: 16 }}>
              <Form.Item name="store_name" label={tp("fields.storeName")} rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="logo_url" label={tp("fields.logoUrl")}>
                <ImageUploadField />
              </Form.Item>
              <Form.Item name="address" label={tp("fields.address")}>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Typography.Text strong>{tp("fields.aboutText")}</Typography.Text>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
                {tp("fields.aboutTextHelp")}
              </Typography.Paragraph>
              <Tabs
                size="small"
                items={SUPPORTED_LANGUAGES.map(({ code, flag, label }) => ({
                  key: code,
                  label: `${flag} ${label}`,
                  children: (
                    <Form.Item name={["about_text", code]} noStyle>
                      <Input.TextArea rows={3} maxLength={500} showCount />
                    </Form.Item>
                  ),
                }))}
              />
            </Card>

            <Card title={tp("sections.contacts")} style={{ marginBottom: 16 }}>
              <Form.Item name="phone" label={tp("fields.phone")}>
                <Input />
              </Form.Item>
              <Form.Item name="support_email" label={tp("fields.supportEmail")}>
                <Input />
              </Form.Item>
              <Form.Item name="support_phone" label={tp("fields.supportPhone")}>
                <Input />
              </Form.Item>
              <Form.Item name="telegram_url" label={tp("fields.telegramUrl")}>
                <Input />
              </Form.Item>
              <Form.Item name="whatsapp_url" label={tp("fields.whatsappUrl")}>
                <Input />
              </Form.Item>
              <Form.Item name="instagram_url" label={tp("fields.instagramUrl")}>
                <Input />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title={tp("sections.currencyLanguage")} style={{ marginBottom: 16 }}>
              <Form.Item name="currency" label={tp("fields.currency")} rules={[{ required: true }]}>
                <Select options={CURRENCY_OPTIONS} />
              </Form.Item>
              <Form.Item
                name="default_language"
                label={tp("fields.defaultLanguage")}
                rules={[{ required: true }]}
              >
                <Select
                  options={SUPPORTED_LANGUAGES.map((l) => ({ label: `${l.flag} ${l.label}`, value: l.code }))}
                />
              </Form.Item>
              <Form.Item name="tax_rate" label={tp("fields.taxRate")}>
                <InputNumber style={{ width: "100%" }} min={0} max={100} step={0.01} addonAfter="%" />
              </Form.Item>
              <Form.Item name="tax_included" label={tp("fields.taxIncluded")} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>

            <Card title={tp("sections.delivery")} style={{ marginBottom: 16 }}>
              <Form.Item name="delivery_info" label={tp("fields.deliveryInfo")}>
                <Input.TextArea rows={3} />
              </Form.Item>

              <Divider orientation="left" plain>
                {tp("fields.workingHours")}
              </Divider>
              {WEEKDAYS.map((day) => (
                <WorkingHoursRow
                  key={day}
                  form={form}
                  day={day}
                  label={tp(`weekdays.${day}`)}
                  closedLabel={tp("weekdayClosed")}
                  openLabel={tp("weekdayOpen")}
                />
              ))}
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
