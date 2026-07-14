import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Role } from "@/types/entities";

const hooks = createResourceHooks<Role>("/roles", "roles");

export default function RolesPage() {
  const { t } = useTranslation(["users", "common"]);
  const tp = (key: string) => t(`roles.${key}`, { ns: "users" });

  const columns: ColumnsType<Role> = [
    { title: tp("columns.name"), dataIndex: "name", sorter: true },
    { title: tp("columns.description"), dataIndex: "description", ellipsis: true },
  ];

  const fields: FormFieldConfig[] = [
    { name: "name", label: tp("fields.name"), type: "text", required: true },
    { name: "description", label: tp("fields.description"), type: "textarea" },
  ];

  return (
    <CrudPage<Role>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
