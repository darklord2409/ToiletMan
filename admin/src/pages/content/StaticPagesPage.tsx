import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { StaticPage } from "@/types/entities";

const hooks = createResourceHooks<StaticPage>("/static-pages", "static-pages");

export default function StaticPagesPage() {
  const { t } = useTranslation(["content", "common"]);
  const tp = (key: string) => t(`staticPages.${key}`, { ns: "content" });

  const columns: ColumnsType<StaticPage> = [
    { title: tp("columns.title"), dataIndex: "title", sorter: true },
    { title: tp("columns.slug"), dataIndex: "slug" },
    {
      title: tp("columns.status"),
      dataIndex: "is_published",
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? tp("columns.published") : tp("columns.draft")}</Tag>,
    },
  ];

  const fields: FormFieldConfig[] = [
    { name: "title", label: tp("fields.title"), type: "text", required: true },
    { name: "slug", label: tp("fields.slug"), type: "text", required: true },
    { name: "content", label: tp("fields.content"), type: "textarea", required: true },
    { name: "is_published", label: tp("fields.published"), type: "boolean" },
  ];

  return (
    <CrudPage<StaticPage>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
