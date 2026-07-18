import { useState } from "react";
import { Button, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Discount } from "@/types/entities";
import { CreateDiscountModal } from "./CreateDiscountModal";

const hooks = createResourceHooks<Discount>("/discounts", "discounts");

export default function DiscountsPage() {
  const { t } = useTranslation(["commerce", "common"]);
  const tp = (key: string) => t(`discounts.${key}`, { ns: "commerce" });
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const scopeLabel: Record<string, string> = {
    all: tp("fields.scopeAll"),
    product: tp("fields.scopeProduct"),
    category: tp("fields.scopeCategory"),
    cart: tp("fields.scopeCart"),
    shipping: tp("fields.scopeShipping"),
  };
  const scopeColor: Record<string, string> = {
    all: "gold",
    product: "purple",
    category: "blue",
    cart: "default",
    shipping: "default",
  };

  const columns: ColumnsType<Discount> = [
    { title: tp("columns.name"), dataIndex: "name", render: (v: string | null) => v ?? "—" },
    {
      title: tp("columns.scope"),
      dataIndex: "scope",
      render: (v: string) => <Tag color={scopeColor[v]}>{scopeLabel[v] ?? v}</Tag>,
    },
    { title: tp("columns.categoryId"), dataIndex: "category_id", ellipsis: true, render: (v: string | null) => v ?? "—" },
    { title: tp("columns.productId"), dataIndex: "product_id", ellipsis: true, render: (v: string | null) => v ?? "—" },
    {
      title: tp("columns.amount"),
      key: "amount",
      render: (_, record) =>
        record.amount_type === "percentage" ? `${record.value}%` : record.value,
    },
    {
      title: tp("columns.status"),
      dataIndex: "is_active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "default"}>
          {active ? t("common:active") : t("common:inactive")}
        </Tag>
      ),
    },
    {
      title: tp("columns.starts"),
      dataIndex: "starts_at",
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : "—"),
    },
    {
      title: tp("columns.ends"),
      dataIndex: "ends_at",
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : "—"),
    },
  ];

  // Used only by the generic edit modal (CrudPage's built-in single-row
  // editor) — creating discounts goes through CreateDiscountModal instead,
  // since scope there decides which target field(s) apply and "several
  // categories" fans out into multiple rows (see that component).
  const fields: FormFieldConfig[] = [
    { name: "name", label: tp("fields.name"), type: "text" },
    {
      name: "scope",
      label: tp("fields.scope"),
      type: "select",
      required: true,
      options: [
        { label: tp("fields.scopeAll"), value: "all" },
        { label: tp("fields.scopeCategory"), value: "category" },
        { label: tp("fields.scopeProduct"), value: "product" },
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
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
    { name: "starts_at", label: tp("fields.startsAt"), type: "date" },
    { name: "ends_at", label: tp("fields.endsAt"), type: "date" },
  ];

  return (
    <>
      <CrudPage<Discount>
        title={tp("title")}
        description={tp("description")}
        resourceHooks={hooks}
        columns={columns}
        formFields={fields}
        allowCreate={false}
        extraToolbar={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            {tp("createModal.openButton")}
          </Button>
        }
      />
      <CreateDiscountModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </>
  );
}
