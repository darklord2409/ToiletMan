import { Button, Select, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Order, OrderStatus } from "@/types/entities";

const hooks = createResourceHooks<Order>("/orders", "orders");

const statusColor: Record<string, string> = {
  pending: "gold",
  confirmed: "blue",
  processing: "geekblue",
  shipped: "cyan",
  delivered: "green",
  cancelled: "red",
  refunded: "volcano",
};

export default function OrdersPage() {
  const { t } = useTranslation(["commerce", "common"]);
  const tp = (key: string) => t(`orders.${key}`, { ns: "commerce" });
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined);

  const statusOptions: { label: string; value: OrderStatus }[] = [
    { label: t("common:orderStatus.pending"), value: "pending" },
    { label: t("common:orderStatus.confirmed"), value: "confirmed" },
    { label: t("common:orderStatus.processing"), value: "processing" },
    { label: t("common:orderStatus.shipped"), value: "shipped" },
    { label: t("common:orderStatus.delivered"), value: "delivered" },
    { label: t("common:orderStatus.cancelled"), value: "cancelled" },
    { label: t("common:orderStatus.refunded"), value: "refunded" },
  ];

  const columns: ColumnsType<Order> = [
    { title: tp("columns.orderNumber"), dataIndex: "order_number", sorter: true },
    {
      title: tp("columns.status"),
      dataIndex: "status",
      render: (s: string) => <Tag color={statusColor[s]}>{t(`common:orderStatus.${s}`, s)}</Tag>,
    },
    { title: tp("columns.grandTotal"), dataIndex: "grand_total", sorter: true, render: (v: string) => `$${v}` },
    { title: tp("columns.currency"), dataIndex: "currency" },
    { title: tp("columns.placed"), dataIndex: "created_at", sorter: true, render: (v: string) => new Date(v).toLocaleString() },
  ];

  const fields: FormFieldConfig[] = [
    {
      name: "customer_id",
      label: tp("fields.customer"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/customers", labelKey: "email" },
    },
    { name: "order_number", label: tp("fields.orderNumber"), type: "text", required: true },
    { name: "status", label: tp("fields.status"), type: "select", options: statusOptions },
    { name: "subtotal", label: tp("fields.subtotal"), type: "decimal" },
    { name: "discount_total", label: tp("fields.discountTotal"), type: "decimal" },
    { name: "tax_total", label: tp("fields.taxTotal"), type: "decimal" },
    { name: "shipping_total", label: tp("fields.shippingTotal"), type: "decimal" },
    { name: "grand_total", label: tp("fields.grandTotal"), type: "decimal" },
    { name: "currency", label: tp("fields.currency"), type: "text" },
    { name: "notes", label: tp("fields.notes"), type: "textarea" },
  ];

  return (
    <CrudPage<Order>
      title={tp("title")}
      description={tp("description")}
      extraToolbar={
        <Select
          allowClear
          placeholder={tp("filterByStatus")}
          style={{ width: 180 }}
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      }
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
      extraFilters={{ status: statusFilter }}
      allowEdit={false}
      extraRowActions={(record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          aria-label={tp("openDetail")}
          onClick={() => navigate(`/commerce/orders/${record.id}`)}
        />
      )}
    />
  );
}
