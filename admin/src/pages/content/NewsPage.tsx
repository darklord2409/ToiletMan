import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { News } from "@/types/entities";

const hooks = createResourceHooks<News>("/news", "news");

export default function NewsPage() {
  const { t } = useTranslation(["content", "common"]);
  const tp = (key: string) => t(`news.${key}`, { ns: "content" });

  const columns: ColumnsType<News> = [
    { title: tp("columns.title"), dataIndex: "title", sorter: true, ellipsis: true },
    { title: tp("columns.slug"), dataIndex: "slug" },
    {
      title: tp("columns.status"),
      dataIndex: "is_published",
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? tp("columns.published") : tp("columns.draft")}</Tag>,
    },
    { title: tp("columns.publishedAt"), dataIndex: "published_at", render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—") },
  ];

  const fields: FormFieldConfig[] = [
    { name: "title", label: tp("fields.title"), type: "text", required: true },
    { name: "slug", label: tp("fields.slug"), type: "text", required: true },
    { name: "excerpt", label: tp("fields.excerpt"), type: "textarea" },
    { name: "content", label: tp("fields.content"), type: "textarea", required: true },
    { name: "cover_image_url", label: tp("fields.coverImageUrl"), type: "image" },
    {
      name: "author_id",
      label: tp("fields.author"),
      type: "select",
      optionsResource: { endpoint: "/admin-users", labelKey: "username" },
    },
    { name: "is_published", label: tp("fields.published"), type: "boolean" },
    { name: "published_at", label: tp("fields.publishedAt"), type: "date" },
  ];

  return (
    <CrudPage<News>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
