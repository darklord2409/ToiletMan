import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { ProductRecommendation, RecommendationType } from "@/types/entities";

const hooks = createResourceHooks<ProductRecommendation>(
  "/product-recommendations",
  "product-recommendations",
);

const RELATION_COLORS: Record<RecommendationType, string> = {
  related: "blue",
  accessory: "purple",
  frequently_bought_together: "gold",
};

export default function ProductRecommendationsPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`productRecommendations.${key}`, { ns: "catalog" });

  const relationOptions: { label: string; value: RecommendationType }[] = [
    { label: tp("relationTypes.related"), value: "related" },
    { label: tp("relationTypes.accessory"), value: "accessory" },
    { label: tp("relationTypes.frequently_bought_together"), value: "frequently_bought_together" },
  ];

  const columns: ColumnsType<ProductRecommendation> = [
    { title: tp("columns.productId"), dataIndex: "product_id", ellipsis: true },
    { title: tp("columns.recommendedProductId"), dataIndex: "recommended_product_id", ellipsis: true },
    {
      title: tp("columns.relationType"),
      dataIndex: "relation_type",
      render: (value: RecommendationType) => (
        <Tag color={RELATION_COLORS[value]}>{tp(`relationTypes.${value}`)}</Tag>
      ),
    },
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
      name: "recommended_product_id",
      label: tp("fields.recommendedProduct"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/products", labelKey: "name" },
    },
    {
      name: "relation_type",
      label: tp("fields.relationType"),
      type: "select",
      required: true,
      options: relationOptions,
    },
    { name: "sort_order", label: tp("fields.sortOrder"), type: "number" },
  ];

  return (
    <CrudPage<ProductRecommendation>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
