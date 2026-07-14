import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { ProductVideo } from "@/types/entities";

const hooks = createResourceHooks<ProductVideo>("/product-videos", "product-videos");

const VIDEO_TYPES = ["youtube", "mp4", "external"];

export default function ProductVideosPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`productVideos.${key}`, { ns: "catalog" });

  const columns: ColumnsType<ProductVideo> = [
    { title: tp("columns.productId"), dataIndex: "product_id", ellipsis: true },
    { title: tp("columns.title"), dataIndex: "title", render: (v: string | null) => v ?? "—" },
    { title: tp("columns.videoType"), dataIndex: "video_type", render: (v: string) => <Tag>{tp(`videoTypes.${v}`)}</Tag> },
    { title: tp("columns.url"), dataIndex: "url", ellipsis: true },
    { title: tp("columns.sortOrder"), dataIndex: "sort_order", sorter: true },
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
      name: "video_type",
      label: tp("fields.videoType"),
      type: "select",
      required: true,
      options: VIDEO_TYPES.map((vt) => ({ label: tp(`videoTypes.${vt}`), value: vt })),
    },
    { name: "title", label: tp("fields.title"), type: "text" },
    { name: "url", label: tp("fields.url"), type: "text", required: true },
    { name: "thumbnail_url", label: tp("fields.thumbnailUrl"), type: "text" },
    { name: "sort_order", label: tp("fields.sortOrder"), type: "number" },
  ];

  return (
    <CrudPage<ProductVideo>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
