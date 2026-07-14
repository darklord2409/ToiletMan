import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Manufacturer } from "@/types/entities";

const hooks = createResourceHooks<Manufacturer>("/manufacturers", "manufacturers");

export default function ManufacturersPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`manufacturers.${key}`, { ns: "catalog" });

  const columns: ColumnsType<Manufacturer> = [
    { title: tp("columns.name"), dataIndex: "name", sorter: true },
    { title: tp("columns.slug"), dataIndex: "slug" },
    { title: tp("columns.website"), dataIndex: "website_url", ellipsis: true },
    {
      title: tp("columns.status"),
      dataIndex: "is_active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "default"}>{active ? t("common:active") : t("common:inactive")}</Tag>
      ),
    },
  ];

  const fields: FormFieldConfig[] = [
    { name: "name", label: tp("fields.name"), type: "text", required: true },
    { name: "slug", label: tp("fields.slug"), type: "text", required: true },
    { name: "description", label: tp("fields.description"), type: "textarea" },
    { name: "logo_url", label: tp("fields.logoUrl"), type: "image" },
    { name: "website_url", label: tp("fields.websiteUrl"), type: "text" },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
  ];

  return (
    <CrudPage<Manufacturer>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
