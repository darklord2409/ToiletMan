import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Customer } from "@/types/entities";

const hooks = createResourceHooks<Customer>("/customers", "customers");

export default function CustomersPage() {
  const { t } = useTranslation(["users", "common"]);
  const tp = (key: string) => t(`customers.${key}`, { ns: "users" });

  const columns: ColumnsType<Customer> = [
    { title: tp("columns.name"), render: (_, r) => [r.first_name, r.last_name].filter(Boolean).join(" ") || "—" },
    { title: tp("columns.email"), dataIndex: "email" },
    { title: tp("columns.phone"), dataIndex: "phone" },
    { title: tp("columns.telegramId"), dataIndex: "telegram_id" },
    {
      title: tp("columns.telegramUsername"),
      dataIndex: "telegram_username",
      render: (username: string | null) =>
        username ? (
          <a href={`https://t.me/${username}`} target="_blank" rel="noreferrer">
            @{username}
          </a>
        ) : (
          "—"
        ),
    },
    {
      title: tp("columns.status"),
      dataIndex: "is_active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "default"}>{active ? t("common:active") : t("common:inactive")}</Tag>
      ),
    },
  ];

  const fields: FormFieldConfig[] = [
    { name: "first_name", label: tp("fields.firstName"), type: "text" },
    { name: "last_name", label: tp("fields.lastName"), type: "text" },
    { name: "email", label: tp("fields.email"), type: "text" },
    { name: "phone", label: tp("fields.phone"), type: "text" },
    { name: "telegram_id", label: tp("fields.telegramId"), type: "number" },
    { name: "password", label: tp("fields.password"), type: "text", helpText: tp("fields.passwordHelp") },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
  ];

  return (
    <CrudPage<Customer>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
