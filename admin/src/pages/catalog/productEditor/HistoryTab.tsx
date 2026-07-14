import { Empty, Skeleton, Timeline } from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { apiClient } from "@/api/client";
import type { PaginatedResponse } from "@/types/api";
import type { AuditLog, PriceHistory } from "@/types/entities";

interface TimelineEntry {
  key: string;
  timestamp: string;
  color: string;
  content: string;
}

export function HistoryTab({ productId }: { productId: string }) {
  const { t } = useTranslation(["catalog", "system", "common"]);
  const tp = (key: string) => t(`products.history.${key}`, { ns: "catalog" });

  const priceHistoryQuery = useQuery({
    queryKey: ["price-history", productId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<PriceHistory>>("/price-history", {
        params: { product_id: productId, page_size: 100, sort_by: "created_at", sort_order: "desc" },
      });
      return data.items;
    },
  });

  const auditLogQuery = useQuery({
    queryKey: ["audit-logs", "product", productId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AuditLog>>("/audit-logs", {
        params: {
          entity_type: "product",
          entity_id: productId,
          page_size: 100,
          sort_by: "created_at",
          sort_order: "desc",
        },
      });
      return data.items;
    },
  });

  if (priceHistoryQuery.isLoading || auditLogQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 5 }} />;
  }

  const priceEntries: TimelineEntry[] = (priceHistoryQuery.data ?? []).map((entry) => ({
    key: `price-${entry.id}`,
    timestamp: entry.created_at,
    color: "gold",
    content: tp("priceChange")
      .replace("{old}", entry.old_price)
      .replace("{new}", entry.new_price)
      .concat(entry.reason ? ` — ${entry.reason}` : ""),
  }));

  const auditEntries: TimelineEntry[] = (auditLogQuery.data ?? []).map((entry) => ({
    key: `audit-${entry.id}`,
    timestamp: entry.created_at,
    color: "blue",
    content: t(`system:auditLogs.actions.${entry.action}`, { defaultValue: entry.action }),
  }));

  const combined = [...priceEntries, ...auditEntries].sort(
    (a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf(),
  );

  if (combined.length === 0) {
    return <Empty description={tp("empty")} />;
  }

  return (
    <Timeline
      items={combined.map((entry) => ({
        key: entry.key,
        color: entry.color,
        children: (
          <div>
            <div>{entry.content}</div>
            <div style={{ fontSize: 12, color: "var(--ant-color-text-tertiary)" }}>
              {dayjs(entry.timestamp).format("YYYY-MM-DD HH:mm")}
            </div>
          </div>
        ),
      }))}
    />
  );
}
