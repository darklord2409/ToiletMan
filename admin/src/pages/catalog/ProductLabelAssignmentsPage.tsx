import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { ProductLabelAssignment } from "@/types/entities";

const hooks = createResourceHooks<ProductLabelAssignment>("/product-label-assignments", "product-label-assignments");

export default function ProductLabelAssignmentsPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`productLabelAssignments.${key}`, { ns: "catalog" });

  const columns: ColumnsType<ProductLabelAssignment> = [
    { title: tp("columns.productId"), dataIndex: "product_id", ellipsis: true },
    { title: tp("columns.productLabelId"), dataIndex: "product_label_id", ellipsis: true },
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
      name: "product_label_id",
      label: tp("fields.productLabel"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/product-labels", labelKey: "name" },
    },
  ];

  return (
    <CrudPage<ProductLabelAssignment>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
      allowEdit={false}
    />
  );
}
