import { Tag } from "antd-mobile";
import { useTranslation } from "react-i18next";

import type { OrderStatus } from "@/types/entities";

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "warning",
  confirmed: "primary",
  processing: "primary",
  shipped: "primary",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
};

export function OrderStatusTag({ status }: { status: OrderStatus }) {
  const { t } = useTranslation("profile");
  return (
    <Tag color={STATUS_COLOR[status]} fill="outline">
      {t(`orders.status.${status}`)}
    </Tag>
  );
}
