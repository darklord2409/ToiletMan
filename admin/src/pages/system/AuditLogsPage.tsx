import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";

import { CrudPage } from "@/components/CrudPage";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { AuditLog } from "@/types/entities";

const hooks = createResourceHooks<AuditLog>("/audit-logs", "audit-logs");

export default function AuditLogsPage() {
  const { t } = useTranslation(["system", "common"]);
  const tp = (key: string, fallback?: string) => t(`auditLogs.${key}`, { ns: "system", defaultValue: fallback ?? key });

  const columns: ColumnsType<AuditLog> = [
    { title: tp("columns.action"), dataIndex: "action", render: (v: string) => tp(`actions.${v}`, v) },
    { title: tp("columns.entityType"), dataIndex: "entity_type", render: (v: string) => tp(`entityTypes.${v}`, v) },
    { title: tp("columns.entityId"), dataIndex: "entity_id", ellipsis: true },
    {
      title: tp("columns.actorType"),
      dataIndex: "actor_type",
      render: (v: string | null) => (v ? <Tag>{tp(`actorTypes.${v}`, v)}</Tag> : "—"),
    },
    { title: tp("columns.ipAddress"), dataIndex: "ip_address" },
    { title: tp("columns.when"), dataIndex: "created_at", sorter: true, render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <CrudPage<AuditLog>
      title={tp("title")}
      description={tp("description")}
      resourceHooks={hooks}
      columns={columns}
      formFields={[]}
      allowCreate={false}
      allowEdit={false}
      allowDelete={false}
    />
  );
}
