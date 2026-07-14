import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { apiClient, extractErrorMessage } from "@/api/client";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { PaginatedResponse } from "@/types/api";
import type { Customer, Order, OrderItem, OrderStatus } from "@/types/entities";

const orderHooks = createResourceHooks<Order>("/orders", "orders");
const customerHooks = createResourceHooks<Customer>("/customers", "customers");

const statusColor: Record<string, string> = {
  pending: "gold",
  confirmed: "blue",
  processing: "geekblue",
  shipped: "cyan",
  delivered: "green",
  cancelled: "red",
  refunded: "volcano",
};

const STATUS_VALUES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["commerce", "common"]);
  const tp = (key: string, opts?: Record<string, unknown>) =>
    t(`orders.detail.${key}`, { ns: "commerce", ...opts });
  const { message } = App.useApp();
  const [form] = Form.useForm<{ status: OrderStatus; manager_notes: string }>();

  const { data: order, isLoading: orderLoading } = orderHooks.useGet(id);
  const { data: customer } = customerHooks.useGet(order?.customer_id);
  const updateOrder = orderHooks.useUpdate();

  const itemsQuery = useQuery({
    queryKey: ["order-items", "by-order", id],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<OrderItem>>("/order-items", {
        params: { order_id: id, page_size: 100 },
      });
      return data.items;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!order) return;
    form.setFieldsValue({ status: order.status, manager_notes: order.manager_notes ?? "" });
  }, [order, form]);

  async function handleSave() {
    if (!id) return;
    const values = await form.validateFields();
    updateOrder.mutate(
      {
        id,
        payload: { status: values.status, manager_notes: values.manager_notes || null },
      },
      {
        onSuccess: () => message.success(t("common:updateSuccess", { entity: tp("title") })),
        onError: (err) => message.error(extractErrorMessage(err)),
      },
    );
  }

  const customerName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "—"
    : "—";
  const telegramLink = customer?.telegram_username
    ? `https://t.me/${customer.telegram_username}`
    : customer?.telegram_id
      ? `tg://user?id=${customer.telegram_id}`
      : null;

  const itemColumns: ColumnsType<OrderItem> = [
    { title: tp("items.sku"), dataIndex: "sku" },
    { title: tp("items.product"), dataIndex: "product_name" },
    { title: tp("items.unitPrice"), dataIndex: "unit_price", align: "right" },
    { title: tp("items.quantity"), dataIndex: "quantity", align: "right" },
    { title: tp("items.lineTotal"), dataIndex: "line_total", align: "right" },
  ];

  if (orderLoading || !order) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate("/commerce/orders")}
        style={{ marginBottom: 12, paddingLeft: 0 }}
      >
        {tp("back")}
      </Button>

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
        <Space align="center" wrap>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {tp("orderTitle", { number: order.order_number })}
          </Typography.Title>
          <Tag color={statusColor[order.status]}>{t(`common:orderStatus.${order.status}`)}</Tag>
        </Space>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={updateOrder.isPending}
          onClick={handleSave}
        >
          {tp("saveAndConfirm")}
        </Button>
      </div>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title={tp("customerCard.title")} style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={tp("customerCard.name")}>{customerName}</Descriptions.Item>
              <Descriptions.Item label={tp("customerCard.phone")}>
                {customer?.phone ? <a href={`tel:${customer.phone}`}>{customer.phone}</a> : "—"}
              </Descriptions.Item>
              <Descriptions.Item label={tp("customerCard.telegramId")}>
                {customer?.telegram_id ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={tp("customerCard.telegramAccount")}>
                {telegramLink ? (
                  <a href={telegramLink} target="_blank" rel="noreferrer">
                    <SendOutlined /> {customer?.telegram_username ? `@${customer.telegram_username}` : telegramLink}
                  </a>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title={tp("contactCard.title")} style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={tp("contactCard.name")}>
                {order.contact_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label={tp("contactCard.phone")}>
                {order.contact_phone ? <a href={`tel:${order.contact_phone}`}>{order.contact_phone}</a> : "—"}
              </Descriptions.Item>
              <Descriptions.Item label={tp("contactCard.deliveryMethod")}>
                {order.delivery_method ? tp(`deliveryMethod.${order.delivery_method}`) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label={tp("contactCard.paymentMethod")}>
                {order.payment_method ? tp(`paymentMethod.${order.payment_method}`) : "—"}
              </Descriptions.Item>
              {order.shipping_address && (
                <Descriptions.Item label={tp("contactCard.address")}>
                  {String(order.shipping_address.address ?? JSON.stringify(order.shipping_address))}
                </Descriptions.Item>
              )}
              <Descriptions.Item label={tp("contactCard.comment")}>
                {order.notes || "—"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={tp("statusCard.title")} style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical">
              <Form.Item name="status" label={tp("statusCard.status")}>
                <Select
                  options={STATUS_VALUES.map((s) => ({
                    label: t(`common:orderStatus.${s}`),
                    value: s,
                  }))}
                />
              </Form.Item>
              <Form.Item name="manager_notes" label={tp("statusCard.managerNotes")}>
                <Input.TextArea rows={3} placeholder={tp("statusCard.managerNotesPlaceholder")} />
              </Form.Item>
            </Form>
          </Card>

          <Card title={tp("totalsCard.title")}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={tp("totalsCard.subtotal")}>
                {order.subtotal} {order.currency}
              </Descriptions.Item>
              <Descriptions.Item label={tp("totalsCard.discount")}>
                {order.discount_total} {order.currency}
              </Descriptions.Item>
              <Descriptions.Item label={tp("totalsCard.tax")}>
                {order.tax_total} {order.currency}
              </Descriptions.Item>
              <Descriptions.Item label={tp("totalsCard.shipping")}>
                {order.shipping_total} {order.currency}
              </Descriptions.Item>
              <Descriptions.Item label={tp("totalsCard.grandTotal")}>
                <Typography.Text strong>
                  {order.grand_total} {order.currency}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label={tp("totalsCard.placed")}>
                {new Date(order.created_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title={tp("items.title")} style={{ marginTop: 16 }}>
        <Table<OrderItem>
          rowKey="id"
          size="small"
          pagination={false}
          loading={itemsQuery.isLoading}
          columns={itemColumns}
          dataSource={itemsQuery.data ?? []}
        />
      </Card>
    </div>
  );
}
