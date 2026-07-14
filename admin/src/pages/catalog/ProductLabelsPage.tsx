import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { ProductLabel } from "@/types/entities";

const hooks = createResourceHooks<ProductLabel>("/product-labels", "product-labels");

export default function ProductLabelsPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`productLabels.${key}`, { ns: "catalog" });

  const columns: ColumnsType<ProductLabel> = [
    { title: tp("columns.code"), dataIndex: "code", sorter: true },
    { title: tp("columns.name"), dataIndex: "name", sorter: true },
    {
      title: tp("columns.badgeColor"),
      dataIndex: "badge_color",
      render: (v: string | null) => (v ? <Tag color={v}>{v}</Tag> : "—"),
    },
    { title: tp("columns.sortOrder"), dataIndex: "sort_order", sorter: true },
    {
      title: tp("columns.status"),
      dataIndex: "is_active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "default"}>{active ? t("common:active") : t("common:inactive")}</Tag>
      ),
    },
  ];

  const fields: FormFieldConfig[] = [
    { name: "code", label: tp("fields.code"), type: "text", required: true },
    { name: "name", label: tp("fields.name"), type: "text", required: true },
    { name: "badge_color", label: tp("fields.badgeColor"), type: "text", helpText: tp("fields.badgeColorHelp") },
    { name: "sort_order", label: tp("fields.sortOrder"), type: "number" },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
    { name: "translations.en.name", label: tp("fields.nameEn"), type: "text" },
    { name: "translations.uz.name", label: tp("fields.nameUz"), type: "text" },
  ];

  return (
    <CrudPage<ProductLabel>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
