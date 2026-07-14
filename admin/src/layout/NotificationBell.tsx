import { useState } from "react";
import { Badge, Button, Dropdown, Empty, List, Spin, Typography, theme } from "antd";
import { BellOutlined, CheckOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useTranslation } from "react-i18next";

import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types/api";
import type { AuditLog } from "@/types/entities";

dayjs.extend(relativeTime);

const LAST_READ_KEY = "tipobot_admin_notifications_last_read";

export function NotificationBell() {
  const { t } = useTranslation(["notifications", "system"]);
  const { token } = theme.useToken();
  const [lastReadAt, setLastReadAt] = useState(() => localStorage.getItem(LAST_READ_KEY));
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "recent-audit-logs"],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AuditLog>>("/audit-logs", {
        params: { page: 1, page_size: 8, sort_by: "created_at", sort_order: "desc" },
      });
      return data.items;
    },
    refetchInterval: 60_000,
  });

  const items = data ?? [];
  const unreadCount = lastReadAt ? items.filter((log) => log.created_at > lastReadAt).length : items.length;

  function handleMarkAllRead() {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_READ_KEY, now);
    setLastReadAt(now);
  }

  const dropdownContent = (
    <div
      style={{
        width: 340,
        background: token.colorBgElevated,
        borderRadius: 8,
        padding: 8,
        boxShadow: token.boxShadowSecondary,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 8px" }}>
        <Typography.Text strong>{t("recentActivity")}</Typography.Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={handleMarkAllRead}>
            {t("markAllRead")}
          </Button>
        )}
      </div>
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : items.length === 0 ? (
        <Empty description={t("noRecentActivity")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={items}
          renderItem={(log) => (
            <List.Item style={{ padding: "8px" }}>
              <List.Item.Meta
                title={
                  <span style={{ fontSize: 13 }}>
                    {t(`system:auditLogs.actions.${log.action}`, { defaultValue: log.action })}
                    {" · "}
                    {t(`system:auditLogs.entityTypes.${log.entity_type}`, { defaultValue: log.entity_type })}
                  </span>
                }
                description={<span style={{ fontSize: 12 }}>{dayjs(log.created_at).fromNow()}</span>}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Dropdown popupRender={() => dropdownContent} trigger={["click"]} placement="bottomRight">
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <BellOutlined style={{ fontSize: 18, cursor: "pointer" }} />
      </Badge>
    </Dropdown>
  );
}
