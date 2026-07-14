import {
  AppstoreOutlined,
  BarChartOutlined,
  DashboardOutlined,
  FileTextOutlined,
  GiftOutlined,
  HistoryOutlined,
  LinkOutlined,
  NotificationOutlined,
  PictureOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

export interface NavItem {
  key: string;
  labelKey: string;
  path: string;
  icon: ReactNode;
}

export interface NavGroup {
  key: string;
  labelKey: string;
  items: NavItem[];
}

// Labels are i18n keys resolved at render time via t(labelKey, { ns: "nav" })
// so this config never needs to change when a language is added or edited.
export const navGroups: NavGroup[] = [
  {
    key: "catalog",
    labelKey: "groups.catalog",
    items: [
      { key: "products", labelKey: "items.products", path: "/catalog/products", icon: <ShopOutlined /> },
      { key: "categories", labelKey: "items.categories", path: "/catalog/categories", icon: <AppstoreOutlined /> },
      { key: "manufacturers", labelKey: "items.manufacturers", path: "/catalog/manufacturers", icon: <TagsOutlined /> },
      { key: "units", labelKey: "items.units", path: "/catalog/units", icon: <TagsOutlined /> },
      { key: "attribute-definitions", labelKey: "items.attribute-definitions", path: "/catalog/attribute-definitions", icon: <TagsOutlined /> },
      { key: "product-attributes", labelKey: "items.product-attributes", path: "/catalog/product-attributes", icon: <TagsOutlined /> },
      { key: "product-types", labelKey: "items.product-types", path: "/catalog/product-types", icon: <AppstoreOutlined /> },
      { key: "attribute-sets", labelKey: "items.attribute-sets", path: "/catalog/attribute-sets", icon: <TagsOutlined /> },
      { key: "attribute-groups", labelKey: "items.attribute-groups", path: "/catalog/attribute-groups", icon: <TagsOutlined /> },
      { key: "reference-values", labelKey: "items.reference-values", path: "/catalog/reference-values", icon: <TagsOutlined /> },
      { key: "collections", labelKey: "items.collections", path: "/catalog/collections", icon: <GiftOutlined /> },
      { key: "product-labels", labelKey: "items.product-labels", path: "/catalog/product-labels", icon: <TagsOutlined /> },
      { key: "product-label-assignments", labelKey: "items.product-label-assignments", path: "/catalog/product-label-assignments", icon: <TagsOutlined /> },
      { key: "product-documents", labelKey: "items.product-documents", path: "/catalog/product-documents", icon: <FileTextOutlined /> },
      { key: "product-videos", labelKey: "items.product-videos", path: "/catalog/product-videos", icon: <PictureOutlined /> },
      { key: "product-recommendations", labelKey: "items.product-recommendations", path: "/catalog/product-recommendations", icon: <LinkOutlined /> },
    ],
  },
  {
    key: "commerce",
    labelKey: "groups.commerce",
    items: [
      { key: "orders", labelKey: "items.orders", path: "/commerce/orders", icon: <ShoppingCartOutlined /> },
      { key: "order-items", labelKey: "items.order-items", path: "/commerce/order-items", icon: <ShoppingCartOutlined /> },
      { key: "carts", labelKey: "items.carts", path: "/commerce/carts", icon: <ShoppingCartOutlined /> },
      { key: "cart-items", labelKey: "items.cart-items", path: "/commerce/cart-items", icon: <ShoppingCartOutlined /> },
      { key: "promotions", labelKey: "items.promotions", path: "/commerce/promotions", icon: <GiftOutlined /> },
      { key: "discounts", labelKey: "items.discounts", path: "/commerce/discounts", icon: <GiftOutlined /> },
      { key: "coupons", labelKey: "items.coupons", path: "/commerce/coupons", icon: <GiftOutlined /> },
    ],
  },
  {
    key: "users",
    labelKey: "groups.users",
    items: [
      { key: "customers", labelKey: "items.customers", path: "/users/customers", icon: <UserOutlined /> },
      { key: "admin-users", labelKey: "items.admin-users", path: "/users/admin-users", icon: <TeamOutlined /> },
      { key: "roles", labelKey: "items.roles", path: "/users/roles", icon: <SafetyCertificateOutlined /> },
      { key: "permissions", labelKey: "items.permissions", path: "/users/permissions", icon: <SafetyCertificateOutlined /> },
      { key: "role-permissions", labelKey: "items.role-permissions", path: "/users/role-permissions", icon: <SafetyCertificateOutlined /> },
    ],
  },
  {
    key: "content",
    labelKey: "groups.content",
    items: [
      { key: "banners", labelKey: "items.banners", path: "/content/banners", icon: <NotificationOutlined /> },
      { key: "news", labelKey: "items.news", path: "/content/news", icon: <FileTextOutlined /> },
      { key: "static-pages", labelKey: "items.static-pages", path: "/content/static-pages", icon: <FileTextOutlined /> },
      { key: "store-settings", labelKey: "items.store-settings", path: "/content/store-settings", icon: <SettingOutlined /> },
      { key: "site-settings", labelKey: "items.site-settings", path: "/content/site-settings", icon: <SettingOutlined /> },
      { key: "bot-settings", labelKey: "items.bot-settings", path: "/content/bot-settings", icon: <RobotOutlined /> },
    ],
  },
  {
    key: "system",
    labelKey: "groups.system",
    items: [
      { key: "audit-logs", labelKey: "items.audit-logs", path: "/system/audit-logs", icon: <HistoryOutlined /> },
      { key: "price-history", labelKey: "items.price-history", path: "/system/price-history", icon: <HistoryOutlined /> },
      { key: "uploaded-files", labelKey: "items.uploaded-files", path: "/system/uploaded-files", icon: <UploadOutlined /> },
      { key: "analytics", labelKey: "items.analytics", path: "/system/analytics", icon: <BarChartOutlined /> },
    ],
  },
];

export const dashboardNavItem: NavItem = {
  key: "dashboard",
  labelKey: "dashboard",
  path: "/",
  icon: <DashboardOutlined />,
};
