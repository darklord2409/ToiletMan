import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { AttributeDefinition } from "@/types/entities";

const hooks = createResourceHooks<AttributeDefinition>("/attribute-definitions", "attribute-definitions");

export default function AttributeDefinitionsPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`attributeDefinitions.${key}`, { ns: "catalog" });

  const columns: ColumnsType<AttributeDefinition> = [
    { title: tp("columns.code"), dataIndex: "code", sorter: true },
    { title: tp("columns.name"), dataIndex: "name" },
    { title: tp("columns.dataType"), dataIndex: "data_type", render: (v: string) => <Tag>{v}</Tag> },
    {
      title: tp("columns.filterable"),
      dataIndex: "is_filterable",
      render: (v: boolean) => (v ? <Tag color="blue">{tp("columns.filterable")}</Tag> : null),
    },
  ];

  const fields: FormFieldConfig[] = [
    { name: "code", label: tp("fields.code"), type: "text", required: true },
    { name: "name", label: tp("fields.name"), type: "text", required: true },
    {
      name: "data_type",
      label: tp("fields.dataType"),
      type: "select",
      required: true,
      options: [
        { label: tp("fields.dataTypeString"), value: "string" },
        { label: tp("fields.dataTypeNumber"), value: "number" },
        { label: tp("fields.dataTypeBoolean"), value: "boolean" },
        { label: tp("fields.dataTypeDate"), value: "date" },
      ],
    },
    {
      name: "unit_id",
      label: tp("fields.unit"),
      type: "select",
      optionsResource: { endpoint: "/units", labelKey: "name" },
    },
    { name: "is_filterable", label: tp("fields.filterable"), type: "boolean" },
  ];

  return (
    <CrudPage<AttributeDefinition>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
