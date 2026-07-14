import { Button, Dialog, Image, SpinLoading, Stepper, SwipeAction, Toast } from "antd-mobile";
import { ShopbagOutline } from "antd-mobile-icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { EmptyState } from "@/components/EmptyState";
import { PriceTag } from "@/components/PriceTag";
import { formatMoney } from "@/lib/format";
import { useCart, useClearCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/useCart";
import { useHaptics } from "@/telegram/hooks";

export default function CartPage() {
  const { t } = useTranslation("cart");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();
  const haptics = useHaptics();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <SpinLoading />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="scroll-page">
        <div style={{ padding: "12px 12px 0" }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{t("title")}</h2>
        </div>
        <EmptyState
          icon={<ShopbagOutline fontSize={48} color="var(--adm-color-weak)" />}
          title={t("empty.title")}
          description={t("empty.description")}
          actionLabel={t("empty.action")}
          onAction={() => navigate("/catalog")}
        />
      </div>
    );
  }

  async function handleClear() {
    // antd-mobile's imperative Dialog renders outside the React tree, so it
    // never inherits the app's ConfigProvider locale — confirmText/cancelText
    // default to antd-mobile's own Chinese copy unless passed explicitly.
    const confirmed = await Dialog.confirm({
      content: t("confirmClear"),
      confirmText: tCommon("actions.confirm"),
      cancelText: tCommon("actions.cancel"),
    });
    if (confirmed) clearCart.mutate();
  }

  return (
    <div className="scroll-page" style={{ paddingBottom: "calc(var(--tab-bar-height) + var(--safe-bottom) + 96px)" }}>
      <div style={{ padding: "12px 12px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{t("title")}</h2>
        <span role="button" onClick={handleClear} style={{ fontSize: 13, color: "var(--adm-color-danger)" }}>
          {t("clearCart")}
        </span>
      </div>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {cart.items.map((item) => (
          <SwipeAction
            key={item.id}
            rightActions={[
              {
                key: "remove",
                text: t("remove"),
                color: "danger",
                onClick: () => removeItem.mutate(item.id),
              },
            ]}
          >
            <div
              role="button"
              onClick={() => navigate(`/product/${item.product_id}`)}
              style={{
                display: "flex",
                gap: 10,
                padding: 10,
                borderRadius: 12,
                background: "var(--adm-color-box)",
              }}
            >
              <Image
                src={item.product.primary_image_url ?? undefined}
                width={64}
                height={64}
                fit="cover"
                style={{ borderRadius: 8, flexShrink: 0, background: "var(--adm-color-fill)" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.product.name}
                </div>
                <PriceTag price={item.unit_price} />
                <div
                  style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Stepper
                    min={1}
                    value={item.quantity}
                    onChange={(value) => {
                      if (value === item.quantity) return;
                      updateItem.mutate(
                        { itemId: item.id, quantity: value },
                        { onError: () => Toast.show({ content: tCommon("genericError") }) },
                      );
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{formatMoney(item.line_total)}</span>
                </div>
              </div>
            </div>
          </SwipeAction>
        ))}
      </div>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          // This page keeps the bottom tab bar (it's a tab-root screen), so
          // this footer must sit above it rather than at bottom:0 — the two
          // fixed-position bars would otherwise overlap.
          bottom: "calc(var(--tab-bar-height) + var(--safe-bottom))",
          padding: "10px 16px",
          background: "var(--adm-color-background)",
          borderTop: "1px solid var(--adm-color-border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
          <span>{t("subtotal")}</span>
          <strong>{formatMoney(cart.subtotal)}</strong>
        </div>
        <Button
          block
          color="primary"
          size="large"
          data-testid="go-to-checkout-button"
          onClick={() => {
            haptics.impact("medium");
            navigate("/checkout");
          }}
        >
          {t("checkout")}
        </Button>
      </div>
    </div>
  );
}
