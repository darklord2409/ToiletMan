import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { Cart } from "@/types/entities";

const hooks = createResourceHooks<Cart>("/carts", "carts");

const statusColor: Record<string, string> = { active: "blue", converted: "green", abandoned: "default" };

export default function CartsPage() {
  const { t } = useTranslation(["commerce", "common"]);
  const tp = (key: string) => t(`carts.${key}`, { ns: "commerce" });

  const statusLabel: Record<string, string> = {
    active: tp("fields.statusActive"),
    converted: tp("fields.statusConverted"),
    abandoned: tp("fields.statusAbandoned"),
  };

  const columns: ColumnsType<Cart> = [
    { title: tp("columns.customerId"), dataIndex: "customer_id", ellipsis: true, render: (v: string | null) => v ?? tp("guest") },
    { title: tp("columns.status"), dataIndex: "status", render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s] ?? s}</Tag> },
    { title: tp("columns.sessionToken"), dataIndex: "session_token", ellipsis: true },
    { title: tp("columns.created"), dataIndex: "created_at", render: (v: string) => new Date(v).toLocaleString() },
  ];

  const fields: FormFieldConfig[] = [
    {
      name: "customer_id",
      label: tp("fields.customer"),
      type: "select",
      optionsResource: { endpoint: "/customers", labelKey: "email" },
    },
    { name: "session_token", label: tp("fields.sessionToken"), type: "text" },
    {
      name: "status",
      label: tp("fields.status"),
      type: "select",
      options: [
        { label: tp("fields.statusActive"), value: "active" },
        { label: tp("fields.statusConverted"), value: "converted" },
        { label: tp("fields.statusAbandoned"), value: "abandoned" },
      ],
    },
  ];

  return (
    <CrudPage<Cart>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={fields}
    />
  );
}
