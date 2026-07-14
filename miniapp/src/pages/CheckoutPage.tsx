import { Button, Form, Input, Radio, TextArea, Toast } from "antd-mobile";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/PageHeader";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import { useCustomer } from "@/hooks/useCustomer";
import { checkout } from "@/api/checkout";
import { useHaptics, useTelegramMainButton } from "@/telegram/hooks";
import type { CheckoutRequest, DeliveryMethod } from "@/types/entities";
import { extractErrorMessage } from "@/api/client";

interface CheckoutFormValues {
  contact_name: string;
  contact_phone: string;
  delivery_method: DeliveryMethod;
  address?: string;
  comment?: string;
}

export default function CheckoutPage() {
  const { t } = useTranslation("checkout");
  const navigate = useNavigate();
  const { data: cart } = useCart();
  const { data: customer } = useCustomer();
  const haptics = useHaptics();
  const [form] = Form.useForm<CheckoutFormValues>();
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup");
  const [submitting, setSubmitting] = useState(false);

  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ");

  async function handleSubmit(values: CheckoutFormValues) {
    setSubmitting(true);
    try {
      const payload: CheckoutRequest = {
        contact_name: values.contact_name,
        contact_phone: values.contact_phone,
        delivery_method: values.delivery_method,
        address: values.delivery_method === "delivery" ? values.address : undefined,
        comment: values.comment || undefined,
      };
      const order = await checkout(payload);
      haptics.notification("success");
      navigate(`/profile/orders/${order.id}`, { replace: true, state: { justPlaced: true } });
    } catch (error) {
      haptics.notification("error");
      Toast.show({ content: extractErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  useTelegramMainButton({
    text: t("submit"),
    visible: Boolean(cart && cart.items.length > 0),
    enabled: !submitting,
    loading: submitting,
    onClick: () => form.submit(),
  });

  if (!cart || cart.items.length === 0) {
    return (
      <div className="scroll-page">
        <PageHeader title={t("title")} />
        <div style={{ padding: 32, textAlign: "center", color: "var(--adm-color-weak)" }}>
          {t("emptyCartRedirect")}
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-page" style={{ paddingBottom: 88 }}>
      <PageHeader title={t("title")} />

      <Form
        form={form}
        initialValues={{
          contact_name: customerName,
          contact_phone: customer?.phone ?? "",
          delivery_method: "pickup",
        }}
        onFinish={handleSubmit}
        footer={
          <Button block color="primary" size="large" type="submit" loading={submitting} data-testid="checkout-submit-button">
            {t("submit")}
          </Button>
        }
      >
        <Form.Header>{t("contact.title")}</Form.Header>
        <Form.Item name="contact_name" label={t("contact.name")} rules={[{ required: true, message: t("validation.nameRequired") }]}>
          <Input placeholder={t("contact.namePlaceholder")} data-testid="checkout-name-input" />
        </Form.Item>
        <Form.Item
          name="contact_phone"
          label={t("contact.phone")}
          rules={[{ required: true, message: t("validation.phoneRequired") }]}
        >
          <Input placeholder={t("contact.phonePlaceholder")} type="tel" data-testid="checkout-phone-input" />
        </Form.Item>

        <Form.Header>{t("delivery.title")}</Form.Header>
        <Form.Item name="delivery_method">
          <Radio.Group onChange={(value) => setDeliveryMethod(value as DeliveryMethod)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Radio value="pickup" data-testid="delivery-method-pickup">
                {t("delivery.pickup")}
              </Radio>
              <Radio value="delivery" data-testid="delivery-method-delivery">
                {t("delivery.delivery")}
              </Radio>
            </div>
          </Radio.Group>
        </Form.Item>
        {deliveryMethod === "delivery" && (
          <Form.Item
            name="address"
            label={t("delivery.address")}
            rules={[{ required: true, message: t("validation.addressRequired") }]}
          >
            <TextArea placeholder={t("delivery.addressPlaceholder")} rows={2} data-testid="checkout-address-input" />
          </Form.Item>
        )}

        <Form.Item name="comment" label={t("comment")}>
          <TextArea placeholder={t("commentPlaceholder")} rows={2} />
        </Form.Item>

        <Form.Header>{t("payment.title")}</Form.Header>
        <Form.Item>
          <div style={{ color: "var(--adm-color-weak)", fontSize: 14 }}>{t("payment.cash")}</div>
        </Form.Item>

        <Form.Header>{t("summary.title")}</Form.Header>
        <div style={{ padding: "0 12px 12px" }}>
          {cart.items.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <span>{formatMoney(item.line_total)}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 600,
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid var(--adm-color-border)",
            }}
          >
            <span>{t("cart:subtotal")}</span>
            <span>{formatMoney(cart.subtotal)}</span>
          </div>
        </div>
      </Form>
    </div>
  );
}
