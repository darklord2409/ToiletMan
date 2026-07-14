import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Coupon } from "@/types/entities";

const hooks = createResourceHooks<Coupon>("/coupons", "coupons");

export default function CouponsPage() {
  const { t } = useTranslation(["commerce", "common"]);
  const tp = (key: string) => t(`coupons.${key}`, { ns: "commerce" });

  const amountTypeLabel: Record<string, string> = {
    percentage: tp("fields.amountTypePercentage"),
    fixed_amount: tp("fields.amountTypeFixed"),
  };

  const columns: ColumnsType<Coupon> = [
    { title: tp("columns.code"), dataIndex: "code", sorter: true },
    {
      title: tp("columns.amountType"),
      dataIndex: "amount_type",
      render: (v: string) => amountTypeLabel[v] ?? v,
    },
    { title: tp("columns.discountValue"), dataIndex: "discount_value" },
    { title: tp("columns.usage"), render: (_, r) => `${r.usage_count}${r.usage_limit ? ` / ${r.usage_limit}` : ""}` },
    {
      title: tp("columns.status"),
      dataIndex: "is_active",
      render: (active: boolean) => <Tag color={active ? "green" : "default"}>{active ? t("common:active") : t("common:inactive")}</Tag>,
    },
  ];

  const fields: FormFieldConfig[] = [
    { name: "code", label: tp("fields.code"), type: "text", required: true },
    {
      name: "promotion_id",
      label: tp("fields.promotion"),
      type: "select",
      optionsResource: { endpoint: "/promotions", labelKey: "name" },
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
    { name: "discount_value", label: tp("fields.discountValue"), type: "decimal", required: true },
    { name: "min_order_amount", label: tp("fields.minOrderAmount"), type: "decimal" },
    { name: "usage_limit", label: tp("fields.usageLimit"), type: "number" },
    { name: "starts_at", label: tp("fields.startsAt"), type: "date" },
    { name: "ends_at", label: tp("fields.endsAt"), type: "date" },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
  ];

  return (
    <CrudPage<Coupon>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
