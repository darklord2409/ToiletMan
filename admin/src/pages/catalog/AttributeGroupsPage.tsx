import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { AttributeGroup } from "@/types/entities";

const hooks = createResourceHooks<AttributeGroup>("/attribute-groups", "attribute-groups");

export default function AttributeGroupsPage() {
  const { t } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`attributeGroups.${key}`, { ns: "catalog" });

  const columns: ColumnsType<AttributeGroup> = [
    { title: tp("columns.code"), dataIndex: "code", sorter: true },
    { title: tp("columns.name"), dataIndex: "name", sorter: true },
    { title: tp("columns.sortOrder"), dataIndex: "sort_order", sorter: true },
  ];

  const fields: FormFieldConfig[] = [
    { name: "code", label: tp("fields.code"), type: "text", required: true },
    { name: "name", label: tp("fields.name"), type: "text", required: true },
    { name: "sort_order", label: tp("fields.sortOrder"), type: "number" },
    { name: "translations.en.name", label: tp("fields.nameEn"), type: "text" },
    { name: "translations.uz.name", label: tp("fields.nameUz"), type: "text" },
  ];

  return (
    <CrudPage<AttributeGroup>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
