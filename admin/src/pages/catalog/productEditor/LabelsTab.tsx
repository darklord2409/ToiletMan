import { App, Empty, Skeleton, Tag } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { apiClient, extractErrorMessage } from "@/api/client";
import type { PaginatedResponse } from "@/types/api";
import type { ProductLabel, ProductLabelAssignment } from "@/types/entities";

export function LabelsTab({ productId }: { productId: string }) {
  const { t, i18n } = useTranslation(["catalog", "common"]);
  const tp = (key: string) => t(`products.labels.${key}`, { ns: "catalog" });
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const labelsQuery = useQuery({
    queryKey: ["product-labels-all"],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ProductLabel>>("/product-labels", {
        params: { page_size: 100 },
      });
      return data.items;
    },
  });

  const assignmentsKey = ["product-label-assignments", productId];
  const assignmentsQuery = useQuery({
    queryKey: assignmentsKey,
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ProductLabelAssignment>>(
        "/product-label-assignments",
        { params: { product_id: productId, page_size: 100 } },
      );
      return data.items;
    },
  });

  const assignments = assignmentsQuery.data ?? [];
  const assignmentByLabel = new Map(assignments.map((a) => [a.product_label_id, a.id]));

  async function toggle(label: ProductLabel) {
    try {
      const existing = assignmentByLabel.get(label.id);
      if (existing) {
        await apiClient.delete(`/product-label-assignments/${existing}`);
      } else {
        await apiClient.post("/product-label-assignments", {
          product_id: productId,
          product_label_id: label.id,
        });
      }
      queryClient.invalidateQueries({ queryKey: assignmentsKey });
    } catch (err) {
      message.error(extractErrorMessage(err));
    }
  }

  function localizedName(label: ProductLabel): string {
    const locale = i18n.language;
    return label.translations[locale]?.name ?? label.translations.ru?.name ?? label.code;
  }

  if (labelsQuery.isLoading || assignmentsQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 3 }} />;
  }

  const labels = labelsQuery.data ?? [];
  if (labels.length === 0) {
    return <Empty description={tp("empty")} />;
  }

  return (
    <div>
      <div style={{ marginBottom: 12, color: "var(--ant-color-text-secondary)" }}>{tp("hint")}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {labels.map((label) => {
          const active = assignmentByLabel.has(label.id);
          return (
            <Tag.CheckableTag key={label.id} checked={active} onChange={() => toggle(label)}>
              <span style={{ color: active ? (label.badge_color ?? undefined) : undefined }}>
                {localizedName(label)}
              </span>
            </Tag.CheckableTag>
          );
        })}
      </div>
    </div>
  );
}
