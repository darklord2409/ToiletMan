import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Discount } from "@/types/entities";

const hooks = createResourceHooks<Discount>("/discounts", "discounts");

export default function DiscountsPage() {
  const { t } = useTranslation(["commerce", "common"]);
  const tp = (key: string) => t(`discounts.${key}`, { ns: "commerce" });

  const scopeLabel: Record<string, string> = {
    product: tp("fields.scopeProduct"),
    category: tp("fields.scopeCategory"),
    cart: tp("fields.scopeCart"),
    shipping: tp("fields.scopeShipping"),
  };

  const amountTypeLabel: Record<string, string> = {
    percentage: tp("fields.amountTypePercentage"),
    fixed_amount: tp("fields.amountTypeFixed"),
  };

  const columns: ColumnsType<Discount> = [
    { title: tp("columns.promotionId"), dataIndex: "promotion_id", ellipsis: true },
    { title: tp("columns.scope"), dataIndex: "scope", render: (v: string) => <Tag>{scopeLabel[v] ?? v}</Tag> },
    {
      title: tp("columns.amountType"),
      dataIndex: "amount_type",
      render: (v: string) => amountTypeLabel[v] ?? v,
    },
    { title: tp("columns.value"), dataIndex: "value" },
  ];

  const fields: FormFieldConfig[] = [
    {
      name: "promotion_id",
      label: tp("fields.promotion"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/promotions", labelKey: "name" },
    },
    {
      name: "scope",
      label: tp("fields.scope"),
      type: "select",
      required: true,
      options: [
        { label: tp("fields.scopeProduct"), value: "product" },
        { label: tp("fields.scopeCategory"), value: "category" },
        { label: tp("fields.scopeCart"), value: "cart" },
        { label: tp("fields.scopeShipping"), value: "shipping" },
      ],
    },
    {
      name: "category_id",
      label: tp("fields.categoryScope"),
      type: "select",
      optionsResource: { endpoint: "/categories", labelKey: "name" },
    },
    {
      name: "product_id",
      label: tp("fields.productScope"),
      type: "select",
      optionsResource: { endpoint: "/products", labelKey: "name" },
    },
    {
      name: "amount_type",
      label: tp("fields.amountType"),
      type: "select",
      required: true,
      options: [
        { label: tp("fields.amountTypePercentage"), value: "percentage" },
        { label: tp("fields.amountTypeFixed"), value: "fixed_amount" },
      ],
    },
    { name: "value", label: tp("fields.value"), type: "decimal", required: true },
  ];

  return (
    <CrudPage<Discount>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
