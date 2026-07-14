import { InfiniteScroll, SpinLoading } from "antd-mobile";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { EmptyState } from "@/components/EmptyState";
import { OrderStatusTag } from "@/components/OrderStatusTag";
import { PageHeader } from "@/components/PageHeader";
import { formatMoney } from "@/lib/format";
import { useMyOrders } from "@/hooks/useOrders";

export default function OrdersPage() {
  const { t } = useTranslation("profile");
  const navigate = useNavigate();
  const { data, fetchNextPage, hasNextPage, isLoading } = useMyOrders();
  const orders = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="scroll-page">
      <PageHeader title={t("orders.title")} />

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <SpinLoading />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState title={t("orders.empty")} />
      ) : (
        <>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {orders.map((order) => (
              <div
                key={order.id}
                role="button"
                onClick={() => navigate(`/profile/orders/${order.id}`)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "var(--adm-color-box)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <strong style={{ fontSize: 14 }}>{t("orders.orderNumber", { number: order.order_number })}</strong>
                  <OrderStatusTag status={order.status} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--adm-color-weak)" }}>
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  <span>{formatMoney(order.grand_total, order.currency)}</span>
                </div>
              </div>
            ))}
          </div>
          <InfiniteScroll loadMore={async () => void (await fetchNextPage())} hasMore={Boolean(hasNextPage)} />
        </>
      )}
    </div>
  );
}
