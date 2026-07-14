import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Category } from "@/types/entities";

const hooks = createResourceHooks<Category>("/categories", "categories");

export default function CategoriesPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`categories.${key}`, { ns: "catalog" });

  const columns: ColumnsType<Category> = [
    {
      title: tp("columns.imageUrl"),
      dataIndex: "image_url",
      render: (url: string | null) =>
        url ? (
          <img src={url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />
        ) : null,
    },
    { title: tp("columns.name"), dataIndex: "name", sorter: true },
    { title: tp("columns.slug"), dataIndex: "slug" },
    { title: tp("columns.parentId"), dataIndex: "parent_id", ellipsis: true, render: (v: string | null) => v ?? "—" },
    { title: tp("columns.sortOrder"), dataIndex: "sort_order", sorter: true },
    {
      title: tp("columns.status"),
      dataIndex: "is_active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "default"}>{active ? t("common:active") : t("common:inactive")}</Tag>
      ),
    },
    {
      title: tp("columns.featured"),
      dataIndex: "is_featured",
      render: (featured: boolean) => (featured ? <Tag color="gold">{tp("fields.featured")}</Tag> : null),
    },
  ];

  const fields: FormFieldConfig[] = [
    { name: "name", label: tp("fields.name"), type: "text", required: true },
    { name: "slug", label: tp("fields.slug"), type: "text", required: true },
    {
      name: "parent_id",
      label: tp("fields.parentCategory"),
      type: "select",
      optionsResource: { endpoint: "/categories", labelKey: "name" },
      helpText: tp("fields.parentCategoryHelp"),
    },
    { name: "description", label: tp("fields.description"), type: "textarea" },
    { name: "sort_order", label: tp("fields.sortOrder"), type: "number" },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
    {
      name: "is_featured",
      label: tp("fields.featured"),
      type: "boolean",
      helpText: tp("fields.featuredHelp"),
    },
    { name: "image_url", label: tp("fields.imageUrl"), type: "image" },
  ];

  return (
    <CrudPage<Category>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
