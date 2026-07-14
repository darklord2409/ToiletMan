import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { ProductType } from "@/types/entities";

const hooks = createResourceHooks<ProductType>("/product-types", "product-types");

export default function ProductTypesPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`productTypes.${key}`, { ns: "catalog" });

  const columns: ColumnsType<ProductType> = [
    {
      title: tp("columns.defaultImageUrl"),
      dataIndex: "default_image_url",
      render: (url: string | null) =>
        url ? (
          <img src={url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />
        ) : null,
    },
    { title: tp("columns.code"), dataIndex: "code", sorter: true },
    { title: tp("columns.name"), dataIndex: "name", sorter: true },
    { title: tp("columns.attributeSetId"), dataIndex: "attribute_set_id", ellipsis: true },
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
    {
      name: "attribute_set_id",
      label: tp("fields.attributeSet"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/attribute-sets", labelKey: "name" },
    },
    { name: "sort_order", label: tp("fields.sortOrder"), type: "number" },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
    { name: "default_image_url", label: tp("fields.defaultImageUrl"), type: "image" },
    { name: "translations.en.name", label: tp("fields.nameEn"), type: "text" },
    { name: "translations.uz.name", label: tp("fields.nameUz"), type: "text" },
  ];

  return (
    <CrudPage<ProductType>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
