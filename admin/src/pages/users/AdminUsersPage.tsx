import { useState } from "react";
import { App, Button, Empty, Modal, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DesktopOutlined, LogoutOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, extractErrorMessage } from "@/api/client";
import { CrudPage } from "@/components/CrudPage";
import type { FormFieldConfig } from "@/components/formTypes";
import { createResourceHooks } from "@/hooks/useCrudResource";
import type { AdminSession, AdminUser } from "@/types/entities";

const hooks = createResourceHooks<AdminUser>("/admin-users", "admin-users");

export default function AdminUsersPage() {
  const { t } = useTranslation(["users", "common"]);
  const tp = (key: string, opts?: Record<string, unknown>) =>
    t(`adminUsers.${key}`, { ns: "users", ...opts });
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [sessionsTarget, setSessionsTarget] = useState<AdminUser | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["admin-users", sessionsTarget?.id, "sessions"],
    queryFn: async () => {
      const { data } = await apiClient.get<AdminSession[]>(
        `/admin-users/${sessionsTarget!.id}/sessions`,
      );
      return data;
    },
    enabled: sessionsTarget !== null,
  });

  const revokeOne = useMutation({
    mutationFn: async (jti: string) => {
      await apiClient.delete(`/admin-users/${sessionsTarget!.id}/sessions/${jti}`);
    },
    onSuccess: () => {
      message.success(tp("sessions.revokeSuccess"));
      queryClient.invalidateQueries({ queryKey: ["admin-users", sessionsTarget?.id, "sessions"] });
    },
    onError: (err) => message.error(extractErrorMessage(err)),
  });

  const revokeAll = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/admin-users/${sessionsTarget!.id}/sessions`);
    },
    onSuccess: () => {
      message.success(tp("sessions.revokeAllSuccess"));
      queryClient.invalidateQueries({ queryKey: ["admin-users", sessionsTarget?.id, "sessions"] });
    },
    onError: (err) => message.error(extractErrorMessage(err)),
  });

  const columns: ColumnsType<AdminUser> = [
    { title: tp("columns.username"), dataIndex: "username", sorter: true },
    { title: tp("columns.email"), dataIndex: "email" },
    { title: tp("columns.fullName"), dataIndex: "full_name" },
    {
      title: tp("columns.superuser"),
      dataIndex: "is_superuser",
      render: (v: boolean) => (v ? <Tag color="purple">{tp("columns.superuser")}</Tag> : null),
    },
    {
      title: tp("columns.status"),
      dataIndex: "is_active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "default"}>{active ? t("common:active") : t("common:inactive")}</Tag>
      ),
    },
    {
      title: tp("columns.lastLogin"),
      dataIndex: "last_login_at",
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : tp("columns.never")),
    },
  ];

  const fields: FormFieldConfig[] = [
    { name: "username", label: tp("fields.username"), type: "text", required: true },
    { name: "email", label: tp("fields.email"), type: "text", required: true },
    { name: "full_name", label: tp("fields.fullName"), type: "text" },
    { name: "password", label: tp("fields.password"), type: "text", helpText: tp("fields.passwordHelp") },
    {
      name: "role_id",
      label: tp("fields.role"),
      type: "select",
      optionsResource: { endpoint: "/roles", labelKey: "name" },
    },
    { name: "is_active", label: tp("fields.active"), type: "boolean" },
    { name: "is_superuser", label: tp("fields.superuser"), type: "boolean" },
  ];

  const sessionColumns: ColumnsType<AdminSession> = [
    {
      title: tp("sessions.columns.device"),
      dataIndex: "user_agent",
      render: (v: string | null) => v || tp("sessions.unknown"),
    },
    {
      title: tp("sessions.columns.ip"),
      dataIndex: "ip_address",
      render: (v: string | null) => v || tp("sessions.unknown"),
    },
    {
      title: tp("sessions.columns.createdAt"),
      dataIndex: "created_at",
      render: (v: string | null) => (v ? new Date(v).toLocaleString() : tp("sessions.unknown")),
    },
    {
      title: t("common:actions"),
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title={tp("sessions.confirmRevoke")}
          onConfirm={() => revokeOne.mutate(record.jti)}
          okButtonProps={{ danger: true }}
        >
          <Button size="small" danger icon={<LogoutOutlined />} loading={revokeOne.isPending} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <CrudPage<AdminUser>
        title={tp("title")}
        description={tp("description")}
        resourceHooks={hooks}
        columns={columns}
        formFields={fields}
        extraRowActions={(record) => (
          <Button
            key="sessions"
            size="small"
            icon={<DesktopOutlined />}
            onClick={() => setSessionsTarget(record)}
            title={tp("sessions.title")}
          />
        )}
      />

      <Modal
        open={sessionsTarget !== null}
        title={sessionsTarget ? tp("sessions.titleFor", { username: sessionsTarget.username }) : ""}
        onCancel={() => setSessionsTarget(null)}
        footer={
          <Space>
            <Button onClick={() => setSessionsTarget(null)}>{t("common:close")}</Button>
            <Popconfirm
              title={tp("sessions.confirmRevokeAll")}
              onConfirm={() => revokeAll.mutate()}
              okButtonProps={{ danger: true }}
            >
              <Button danger loading={revokeAll.isPending} disabled={!sessionsQuery.data?.length}>
                {tp("sessions.revokeAll")}
              </Button>
            </Popconfirm>
          </Space>
        }
        width={720}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">{tp("sessions.description")}</Typography.Paragraph>
        <Table<AdminSession>
          rowKey="jti"
          size="small"
          columns={sessionColumns}
          dataSource={sessionsQuery.data ?? []}
          loading={sessionsQuery.isLoading}
          pagination={false}
          locale={{ emptyText: <Empty description={tp("sessions.empty")} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Modal>
    </>
  );
}
