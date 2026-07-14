import { Suspense, lazy } from "react";
import { Spin } from "antd";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { RequireAuth } from "@/auth/RequireAuth";
import { AppLayout } from "@/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import NotFoundPage from "@/pages/NotFoundPage";

// Everything below is route-level code, lazy-loaded so the initial bundle
// isn't ~40 rarely-visited-together admin screens in one 2MB+ chunk — each
// route pulls its own chunk in on first visit instead.
const ManufacturersPage = lazy(() => import("@/pages/catalog/ManufacturersPage"));
const UnitsPage = lazy(() => import("@/pages/catalog/UnitsPage"));
const CategoriesPage = lazy(() => import("@/pages/catalog/CategoriesPage"));
const ProductsPage = lazy(() => import("@/pages/catalog/ProductsPage"));
const ProductEditorPage = lazy(() => import("@/pages/catalog/ProductEditorPage"));
const AttributeDefinitionsPage = lazy(() => import("@/pages/catalog/AttributeDefinitionsPage"));
const ProductAttributesPage = lazy(() => import("@/pages/catalog/ProductAttributesPage"));
const ProductTypesPage = lazy(() => import("@/pages/catalog/ProductTypesPage"));
const AttributeSetsPage = lazy(() => import("@/pages/catalog/AttributeSetsPage"));
const AttributeSetEditorPage = lazy(() => import("@/pages/catalog/AttributeSetEditorPage"));
const AttributeGroupsPage = lazy(() => import("@/pages/catalog/AttributeGroupsPage"));
const ReferenceValuesPage = lazy(() => import("@/pages/catalog/ReferenceValuesPage"));
const CollectionsPage = lazy(() => import("@/pages/catalog/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("@/pages/catalog/CollectionDetailPage"));
const ProductLabelsPage = lazy(() => import("@/pages/catalog/ProductLabelsPage"));
const ProductLabelAssignmentsPage = lazy(() => import("@/pages/catalog/ProductLabelAssignmentsPage"));
const ProductDocumentsPage = lazy(() => import("@/pages/catalog/ProductDocumentsPage"));
const ProductVideosPage = lazy(() => import("@/pages/catalog/ProductVideosPage"));

const CustomersPage = lazy(() => import("@/pages/users/CustomersPage"));
const AdminUsersPage = lazy(() => import("@/pages/users/AdminUsersPage"));
const RolesPage = lazy(() => import("@/pages/users/RolesPage"));
const PermissionsPage = lazy(() => import("@/pages/users/PermissionsPage"));
const RolePermissionsPage = lazy(() => import("@/pages/users/RolePermissionsPage"));

const OrdersPage = lazy(() => import("@/pages/commerce/OrdersPage"));
const OrderDetailPage = lazy(() => import("@/pages/commerce/OrderDetailPage"));
const OrderItemsPage = lazy(() => import("@/pages/commerce/OrderItemsPage"));
const CartsPage = lazy(() => import("@/pages/commerce/CartsPage"));
const CartItemsPage = lazy(() => import("@/pages/commerce/CartItemsPage"));
const PromotionsPage = lazy(() => import("@/pages/commerce/PromotionsPage"));
const DiscountsPage = lazy(() => import("@/pages/commerce/DiscountsPage"));
const CouponsPage = lazy(() => import("@/pages/commerce/CouponsPage"));

const BannersPage = lazy(() => import("@/pages/content/BannersPage"));
const NewsPage = lazy(() => import("@/pages/content/NewsPage"));
const StaticPagesPage = lazy(() => import("@/pages/content/StaticPagesPage"));
const SiteSettingsPage = lazy(() => import("@/pages/content/SiteSettingsPage"));
const StoreSettingsPage = lazy(() => import("@/pages/content/StoreSettingsPage"));
const BotSettingsPage = lazy(() => import("@/pages/content/BotSettingsPage"));

const AuditLogsPage = lazy(() => import("@/pages/system/AuditLogsPage"));
const PriceHistoryPage = lazy(() => import("@/pages/system/PriceHistoryPage"));
const UploadedFilesPage = lazy(() => import("@/pages/system/UploadedFilesPage"));
const AnalyticsPage = lazy(() => import("@/pages/system/AnalyticsPage"));

const ProductRecommendationsPage = lazy(
  () => import("@/pages/catalog/ProductRecommendationsPage"),
);

function RouteFallback() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
      <Spin size="large" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />

            <Route path="catalog/manufacturers" element={<ManufacturersPage />} />
            <Route path="catalog/units" element={<UnitsPage />} />
            <Route path="catalog/categories" element={<CategoriesPage />} />
            <Route path="catalog/products" element={<ProductsPage />} />
            <Route path="catalog/products/:id" element={<ProductEditorPage />} />
            <Route path="catalog/attribute-definitions" element={<AttributeDefinitionsPage />} />
            <Route path="catalog/product-attributes" element={<ProductAttributesPage />} />
            <Route path="catalog/product-types" element={<ProductTypesPage />} />
            <Route path="catalog/attribute-sets" element={<AttributeSetsPage />} />
            <Route path="catalog/attribute-sets/:id" element={<AttributeSetEditorPage />} />
            <Route path="catalog/attribute-groups" element={<AttributeGroupsPage />} />
            <Route path="catalog/reference-values" element={<ReferenceValuesPage />} />
            <Route path="catalog/collections" element={<CollectionsPage />} />
            <Route path="catalog/collections/:id" element={<CollectionDetailPage />} />
            <Route path="catalog/product-labels" element={<ProductLabelsPage />} />
            <Route path="catalog/product-label-assignments" element={<ProductLabelAssignmentsPage />} />
            <Route path="catalog/product-documents" element={<ProductDocumentsPage />} />
            <Route path="catalog/product-videos" element={<ProductVideosPage />} />
            <Route path="catalog/product-recommendations" element={<ProductRecommendationsPage />} />

            <Route path="users/customers" element={<CustomersPage />} />
            <Route path="users/admin-users" element={<AdminUsersPage />} />
            <Route path="users/roles" element={<RolesPage />} />
            <Route path="users/permissions" element={<PermissionsPage />} />
            <Route path="users/role-permissions" element={<RolePermissionsPage />} />

            <Route path="commerce/orders" element={<OrdersPage />} />
            <Route path="commerce/orders/:id" element={<OrderDetailPage />} />
            <Route path="commerce/order-items" element={<OrderItemsPage />} />
            <Route path="commerce/carts" element={<CartsPage />} />
            <Route path="commerce/cart-items" element={<CartItemsPage />} />
            <Route path="commerce/promotions" element={<PromotionsPage />} />
            <Route path="commerce/discounts" element={<DiscountsPage />} />
            <Route path="commerce/coupons" element={<CouponsPage />} />

            <Route path="content/banners" element={<BannersPage />} />
            <Route path="content/news" element={<NewsPage />} />
            <Route path="content/static-pages" element={<StaticPagesPage />} />
            <Route path="content/store-settings" element={<StoreSettingsPage />} />
            <Route path="content/site-settings" element={<SiteSettingsPage />} />
            <Route path="content/bot-settings" element={<BotSettingsPage />} />

            <Route path="system/audit-logs" element={<AuditLogsPage />} />
            <Route path="system/price-history" element={<PriceHistoryPage />} />
            <Route path="system/uploaded-files" element={<UploadedFilesPage />} />
            <Route path="system/analytics" element={<AnalyticsPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
