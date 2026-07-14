import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { OrderItem } from "@/types/entities";

const hooks = createResourceHooks<OrderItem>("/order-items", "order-items");

export default function OrderItemsPage() {
  const { t } = useTranslation(["commerce", "common"]);
  const tp = (key: string) => t(`orderItems.${key}`, { ns: "commerce" });

  const columns: ColumnsType<OrderItem> = [
    { title: tp("columns.orderId"), dataIndex: "order_id", ellipsis: true },
    { title: tp("columns.sku"), dataIndex: "sku" },
    { title: tp("columns.productName"), dataIndex: "product_name" },
    { title: tp("columns.qty"), dataIndex: "quantity" },
    { title: tp("columns.unitPrice"), dataIndex: "unit_price", render: (v: string) => `$${v}` },
    { title: tp("columns.lineTotal"), dataIndex: "line_total", render: (v: string) => `$${v}` },
  ];

  const fields: FormFieldConfig[] = [
    {
      name: "order_id",
      label: tp("fields.order"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/orders", labelKey: "order_number" },
    },
    {
      name: "product_id",
      label: tp("fields.product"),
      type: "select",
      optionsResource: { endpoint: "/products", labelKey: "name" },
    },
    { name: "product_name", label: tp("fields.productName"), type: "text", required: true },
    { name: "sku", label: tp("fields.sku"), type: "text", required: true },
    { name: "unit_price", label: tp("fields.unitPrice"), type: "decimal", required: true },
    { name: "quantity", label: tp("fields.quantity"), type: "number", required: true },
    { name: "line_total", label: tp("fields.lineTotal"), type: "decimal", required: true },
  ];

  return (
    <CrudPage<OrderItem>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
      allowEdit={false}
    />
  );
}
