import { Button, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AppstoreOutlined } from "@ant-design/icons";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Collection } from "@/types/entities";

const hooks = createResourceHooks<Collection>("/collections", "collections");

export default function CollectionsPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`collections.${key}`, { ns: "catalog" });
  const navigate = useNavigate();

  const columns: ColumnsType<Collection> = [
    { title: tp("columns.code"), dataIndex: "code", sorter: true },
    { title: tp("columns.name"), dataIndex: "name", sorter: true },
    { title: tp("columns.slug"), dataIndex: "slug" },
    { title: tp("columns.manufacturerId"), dataIndex: "manufacturer_id", ellipsis: true },
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
      name: "manufacturer_id",
      label: tp("fields.manufacturer"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/manufacturers", labelKey: "name" },
    },
    { name: "code", label: tp("fields.code"), type: "text", required: true },
    { name: "slug", label: tp("fields.slug"), type: "text", required: true },
    { name: "name", label: tp("fields.name"), type: "text", required: true },
    { name: "description", label: tp("fields.description"), type: "textarea" },
    { name: "image_url", label: tp("fields.imageUrl"), type: "image" },
    { name: "sort_order", label: tp("fields.sortOrder"), type: "number" },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
    { name: "translations.en.name", label: tp("fields.nameEn"), type: "text" },
    { name: "translations.en.description", label: tp("fields.descriptionEn"), type: "textarea" },
    { name: "translations.uz.name", label: tp("fields.nameUz"), type: "text" },
    { name: "translations.uz.description", label: tp("fields.descriptionUz"), type: "textarea" },
  ];

  function renderRowActions(record: Collection) {
    return (
      <Tooltip key="manage" title={tp("actions.manage")}>
        <Button
          size="small"
          icon={<AppstoreOutlined />}
          onClick={() => navigate(`/catalog/collections/${record.id}`)}
          aria-label={tp("actions.manage")}
        />
      </Tooltip>
    );
  }

  return (
    <CrudPage<Collection>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
      extraRowActions={renderRowActions}
    />
  );
}
