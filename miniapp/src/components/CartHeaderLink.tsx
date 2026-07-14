import { Badge } from "antd-mobile";
import { ShopbagOutline } from "antd-mobile-icons";
import { useNavigate } from "react-router-dom";

import { useCart } from "@/hooks/useCart";

export function CartHeaderLink() {
  const navigate = useNavigate();
  const { data: cart } = useCart();

  return (
    <span
      role="button"
      aria-label="cart"
      data-testid="cart-header-link"
      onClick={() => navigate("/cart")}
      style={{ display: "flex", alignItems: "center", fontSize: 20 }}
    >
      <Badge content={cart && cart.item_count > 0 ? cart.item_count : null}>
        <ShopbagOutline />
      </Badge>
    </span>
  );
}
