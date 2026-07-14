import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Promotion } from "@/types/entities";

const hooks = createResourceHooks<Promotion>("/promotions", "promotions");

export default function PromotionsPage() {
  const { t } = useTranslation(["commerce", "common"]);
  const tp = (key: string) => t(`promotions.${key}`, { ns: "commerce" });

  const typeLabel: Record<string, string> = {
    percentage: tp("fields.typePercentage"),
    fixed_amount: tp("fields.typeFixedAmount"),
    buy_x_get_y: tp("fields.typeBuyXGetY"),
  };

  const columns: ColumnsType<Promotion> = [
    { title: tp("columns.name"), dataIndex: "name", sorter: true },
    { title: tp("columns.type"), dataIndex: "promotion_type", render: (v: string) => <Tag>{typeLabel[v] ?? v}</Tag> },
    { title: tp("columns.starts"), dataIndex: "starts_at", render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—") },
    { title: tp("columns.ends"), dataIndex: "ends_at", render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—") },
    {
      title: tp("columns.status"),
      dataIndex: "is_active",
      render: (active: boolean) => <Tag color={active ? "green" : "default"}>{active ? t("common:active") : t("common:inactive")}</Tag>,
    },
  ];

  const fields: FormFieldConfig[] = [
    { name: "name", label: tp("fields.name"), type: "text", required: true },
    { name: "description", label: tp("fields.description"), type: "textarea" },
    {
      name: "promotion_type",
      label: tp("fields.type"),
      type: "select",
      required: true,
      options: [
        { label: tp("fields.typePercentage"), value: "percentage" },
        { label: tp("fields.typeFixedAmount"), value: "fixed_amount" },
        { label: tp("fields.typeBuyXGetY"), value: "buy_x_get_y" },
      ],
    },
    { name: "starts_at", label: tp("fields.startsAt"), type: "date" },
    { name: "ends_at", label: tp("fields.endsAt"), type: "date" },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
  ];

  return (
    <CrudPage<Promotion>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
