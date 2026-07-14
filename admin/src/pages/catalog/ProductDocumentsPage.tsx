import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { ProductDocument } from "@/types/entities";

const hooks = createResourceHooks<ProductDocument>("/product-documents", "product-documents");

const DOCUMENT_TYPES = [
  "manual",
  "certificate",
  "warranty_card",
  "installation_instructions",
  "exploded_diagram",
];

export default function ProductDocumentsPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`productDocuments.${key}`, { ns: "catalog" });

  const columns: ColumnsType<ProductDocument> = [
    { title: tp("columns.productId"), dataIndex: "product_id", ellipsis: true },
    { title: tp("columns.title"), dataIndex: "title", sorter: true },
    { title: tp("columns.documentType"), dataIndex: "document_type", render: (v: string) => <Tag>{tp(`documentTypes.${v}`)}</Tag> },
    { title: tp("columns.fileUrl"), dataIndex: "file_url", ellipsis: true },
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
      name: "document_type",
      label: tp("fields.documentType"),
      type: "select",
      required: true,
      options: DOCUMENT_TYPES.map((dt) => ({ label: tp(`documentTypes.${dt}`), value: dt })),
    },
    { name: "title", label: tp("fields.title"), type: "text", required: true },
    { name: "file_url", label: tp("fields.fileUrl"), type: "text", required: true },
    { name: "mime_type", label: tp("fields.mimeType"), type: "text" },
    { name: "size_bytes", label: tp("fields.sizeBytes"), type: "number" },
    { name: "sort_order", label: tp("fields.sortOrder"), type: "number" },
  ];

  return (
    <CrudPage<ProductDocument>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
