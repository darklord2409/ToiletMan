import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { ReferenceValue } from "@/types/entities";

const hooks = createResourceHooks<ReferenceValue>("/reference-values", "reference-values");

const REFERENCE_TYPES = [
  "material",
  "color",
  "country",
  "finish",
  "installation_type",
  "shape",
  "warranty_period",
  "connection_type",
  "thread_size",
  "water_outlet_type",
];

export default function ReferenceValuesPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`referenceValues.${key}`, { ns: "catalog" });

  const columns: ColumnsType<ReferenceValue> = [
    { title: tp("columns.referenceType"), dataIndex: "reference_type", render: (v: string) => <Tag>{tp(`referenceTypes.${v}`)}</Tag> },
    { title: tp("columns.code"), dataIndex: "code", sorter: true },
    { title: tp("columns.name"), dataIndex: "name", sorter: true },
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
    {
      name: "reference_type",
      label: tp("fields.referenceType"),
      type: "select",
      required: true,
      options: REFERENCE_TYPES.map((rt) => ({ label: tp(`referenceTypes.${rt}`), value: rt })),
    },
    { name: "code", label: tp("fields.code"), type: "text", required: true },
    { name: "name", label: tp("fields.name"), type: "text", required: true },
    { name: "sort_order", label: tp("fields.sortOrder"), type: "number" },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
    { name: "translations.en.name", label: tp("fields.nameEn"), type: "text" },
    { name: "translations.uz.name", label: tp("fields.nameUz"), type: "text" },
  ];

  return (
    <CrudPage<ReferenceValue>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
