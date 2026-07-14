import { Image, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Banner } from "@/types/entities";

const hooks = createResourceHooks<Banner>("/banners", "banners");

export default function BannersPage() {
  const { t } = useTranslation(["content", "common"]);
  const tp = (key: string) => t(`banners.${key}`, { ns: "content" });

  const columns: ColumnsType<Banner> = [
    {
      title: tp("columns.preview"),
      dataIndex: "image_url",
      render: (url: string) => <Image src={url} width={64} height={36} style={{ objectFit: "cover" }} fallback="" />,
    },
    { title: tp("columns.title"), dataIndex: "title", sorter: true },
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
    { name: "title", label: tp("fields.title"), type: "text", required: true },
    { name: "image_url", label: tp("fields.imageUrl"), type: "image", required: true },
    { name: "link_url", label: tp("fields.linkUrl"), type: "text" },
    { name: "sort_order", label: tp("fields.sortOrder"), type: "number" },
    { name: "starts_at", label: tp("fields.startsAt"), type: "date" },
    { name: "ends_at", label: tp("fields.endsAt"), type: "date" },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
  ];

  return (
    <CrudPage<Banner>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
