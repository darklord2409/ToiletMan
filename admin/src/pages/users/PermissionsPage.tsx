import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Permission } from "@/types/entities";

const hooks = createResourceHooks<Permission>("/permissions", "permissions");

export default function PermissionsPage() {
  const { t } = useTranslation(["users", "common"]);
  const tp = (key: string) => t(`permissions.${key}`, { ns: "users" });

  const columns: ColumnsType<Permission> = [
    { title: tp("columns.code"), dataIndex: "code", sorter: true },
    { title: tp("columns.description"), dataIndex: "description", ellipsis: true },
  ];

  const fields: FormFieldConfig[] = [
    { name: "code", label: tp("fields.code"), type: "text", required: true },
    { name: "description", label: tp("fields.description"), type: "textarea" },
  ];

  return (
    <CrudPage<Permission>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
