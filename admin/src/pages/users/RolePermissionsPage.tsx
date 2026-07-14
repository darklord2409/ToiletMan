import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { RolePermission } from "@/types/entities";

const hooks = createResourceHooks<RolePermission>("/role-permissions", "role-permissions");

export default function RolePermissionsPage() {
  const { t } = useTranslation(["users", "common"]);
  const tp = (key: string) => t(`rolePermissions.${key}`, { ns: "users" });

  const columns: ColumnsType<RolePermission> = [
    { title: tp("columns.roleId"), dataIndex: "role_id", ellipsis: true },
    { title: tp("columns.permissionId"), dataIndex: "permission_id", ellipsis: true },
  ];

  const fields: FormFieldConfig[] = [
    {
      name: "role_id",
      label: tp("fields.role"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/roles", labelKey: "name" },
    },
    {
      name: "permission_id",
      label: tp("fields.permission"),
      type: "select",
      required: true,
      optionsResource: { endpoint: "/permissions", labelKey: "code" },
    },
  ];

  return (
    <CrudPage<RolePermission>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
      allowEdit={false}
    />
  );
}
