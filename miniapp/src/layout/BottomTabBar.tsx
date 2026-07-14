import { Badge, TabBar } from "antd-mobile";
import { AppOutline, HeartOutline, ShopbagOutline, UnorderedListOutline, UserOutline } from "antd-mobile-icons";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useCart } from "@/hooks/useCart";

export function BottomTabBar() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const { data: cart } = useCart();

  const tabs = [
    { key: "/", title: t("nav.home"), icon: <AppOutline /> },
    { key: "/catalog", title: t("nav.catalog"), icon: <UnorderedListOutline /> },
    { key: "/favorites", title: t("nav.favorites"), icon: <HeartOutline /> },
    {
      key: "/cart",
      title: t("nav.cart"),
      icon: (
        <Badge
          content={cart && cart.item_count > 0 ? cart.item_count : null}
          data-testid="cart-badge"
          data-count={cart?.item_count ?? 0}
        >
          <ShopbagOutline />
        </Badge>
      ),
    },
    { key: "/profile", title: t("nav.profile"), icon: <UserOutline /> },
  ];

  return (
    <TabBar
      activeKey={location.pathname}
      onChange={(key) => navigate(key)}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "var(--adm-color-background)",
        borderTop: "1px solid var(--adm-color-border)",
        paddingBottom: "var(--safe-bottom)",
      }}
    >
      {tabs.map((tab) => (
        <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
      ))}
    </TabBar>
  );
}
