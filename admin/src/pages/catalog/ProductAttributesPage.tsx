import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { ProductAttribute } from "@/types/entities";

const hooks = createResourceHooks<ProductAttribute>("/product-attributes", "product-attributes");

export default function ProductAttributesPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`productAttributes.${key}`, { ns: "catalog" });

  const columns: ColumnsType<ProductAttribute> = [
    { title: tp("columns.productId"), dataIndex: "product_id", ellipsis: true },
    { title: tp("columns.attributeDefinitionId"), dataIndex: "attribute_definition_id", ellipsis: true },
    { title: tp("columns.stringValue"), dataIndex: "value_string" },
    { title: tp("columns.numberValue"), dataIndex: "value_number" },
    {
      title: tp("columns.booleanValue"),
      dataIndex: "value_boolean",
      render: (v: boolean | null) => (v === null ? "—" : String(v)),
    },
  ];

  const fields: FormFieldConfig[] = [
    {
      name: "product_id",
      label: tp("fields.product"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/products", labelKey: "name" },
    },
    {
      name: "attribute_definition_id",
      label: tp("fields.attributeDefinition"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/attribute-definitions", labelKey: "name" },
    },
    { name: "value_string", label: tp("fields.stringValue"), type: "text" },
    { name: "value_number", label: tp("fields.numberValue"), type: "decimal" },
    { name: "value_boolean", label: tp("fields.booleanValue"), type: "boolean" },
    { name: "value_date", label: tp("fields.dateValue"), type: "date" },
  ];

  return (
    <CrudPage<ProductAttribute>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
