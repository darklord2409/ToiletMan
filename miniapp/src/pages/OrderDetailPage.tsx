import { Button, SpinLoading } from "antd-mobile";
import { CheckCircleFill } from "antd-mobile-icons";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { OrderStatusTag } from "@/components/OrderStatusTag";
import { PageHeader } from "@/components/PageHeader";
import { formatMoney } from "@/lib/format";
import { useMyOrder } from "@/hooks/useOrders";

export default function OrderDetailPage() {
  const { t } = useTranslation("profile");
  const { t: tCheckout } = useTranslation("checkout");
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const justPlaced = Boolean((location.state as { justPlaced?: boolean } | null)?.justPlaced);
  const { data: order, isLoading } = useMyOrder(id);

  if (isLoading || !order) {
    return (
      <div className="scroll-page">
        <PageHeader title="" />
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <SpinLoading />
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-page">
      <PageHeader title={t("orders.detailsTitle", { number: order.order_number })} />

      {justPlaced && (
        <div
          style={{
            margin: 12,
            padding: 16,
            borderRadius: 12,
            background: "var(--adm-color-success)",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <CheckCircleFill fontSize={32} />
          <div style={{ fontWeight: 600, marginTop: 6 }}>{tCheckout("success.title")}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {tCheckout("success.description", { orderNumber: order.order_number })}
          </div>
          <Button
            fill="outline"
            style={{ marginTop: 10, "--border-color": "#fff", "--text-color": "#fff" }}
            onClick={() => navigate("/", { replace: true })}
          >
            {tCheckout("success.continueShopping")}
          </Button>
        </div>
      )}

      <div style={{ padding: "0 12px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "var(--adm-color-weak)" }}>
            {new Date(order.created_at).toLocaleString()}
          </span>
          <OrderStatusTag status={order.status} />
        </div>

        <div style={{ background: "var(--adm-color-box)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
          {order.items.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
              <span>
                {item.product_name} × {item.quantity}
              </span>
              <span>{formatMoney(item.line_total, order.currency)}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 600,
              paddingTop: 8,
              borderTop: "1px solid var(--adm-color-border)",
            }}
          >
            <span>{t("orders.total")}</span>
            <span>{formatMoney(order.grand_total, order.currency)}</span>
          </div>
        </div>

        <div style={{ background: "var(--adm-color-box)", borderRadius: 12, padding: 12, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "var(--adm-color-weak)" }}>{t("orders.deliveryMethod")}</span>
            <span>
              {order.delivery_method === "delivery" ? tCheckout("delivery.delivery") : tCheckout("delivery.pickup")}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--adm-color-weak)" }}>{t("orders.contact")}</span>
            <span>
              {order.contact_name}, {order.contact_phone}
            </span>
          </div>
        </div>

        {order.notes && (
          <div style={{ background: "var(--adm-color-box)", borderRadius: 12, padding: 12, fontSize: 13, marginTop: 12 }}>
            <div style={{ color: "var(--adm-color-weak)", marginBottom: 4 }}>{t("orders.comment")}</div>
            <div>{order.notes}</div>
          </div>
        )}

        {order.manager_notes && (
          <div style={{ background: "var(--adm-color-box)", borderRadius: 12, padding: 12, fontSize: 13, marginTop: 12 }}>
            <div style={{ color: "var(--adm-color-weak)", marginBottom: 4 }}>{t("orders.managerNotes")}</div>
            <div>{order.manager_notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
