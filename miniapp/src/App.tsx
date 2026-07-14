import { Suspense, lazy } from "react";
import { SpinLoading } from "antd-mobile";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import { AppLayout } from "@/layout/AppLayout";
import { PhoneRequiredScreen } from "@/components/PhoneRequiredScreen";
import { SplashScreen } from "@/components/SplashScreen";
import { useTelegramDesktopWheelScrollFix } from "@/telegram/hooks";

const HomePage = lazy(() => import("@/pages/HomePage"));
const CatalogPage = lazy(() => import("@/pages/CatalogPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage"));
const FavoritesPage = lazy(() => import("@/pages/FavoritesPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const OrdersPage = lazy(() => import("@/pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("@/pages/OrderDetailPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ContactsPage = lazy(() => import("@/pages/ContactsPage"));
const StoreInfoPage = lazy(() => import("@/pages/StoreInfoPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function RouteFallback() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
      <SpinLoading />
    </div>
  );
}

export default function App() {
  const { status, customer, isTelegram } = useAuth();
  useTelegramDesktopWheelScrollFix();

  // No hard "must be inside Telegram" gate: some real clients (confirmed on
  // Telegram Desktop) never expose usable initData at all, and a customer
  // who can't even browse the catalog is worse than one browsing without
  // personalization. Auth-gated actions (cart, favorites, checkout) already
  // check `status === "authenticated"` individually at the component level.
  if (status === "initializing") return <SplashScreen />;

  // Genuine Telegram launches, however, must have a phone number on file —
  // the store needs it for every order regardless of how the customer got
  // there. Only enforced when isTelegram is true, so the Telegram-Desktop
  // initData bug (isTelegram false there) still degrades to guest browsing
  // instead of a dead end.
  if (status === "authenticated" && isTelegram && !customer?.phone) {
    return <PhoneRequiredScreen />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="catalog/:categoryId" element={<CatalogPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="product/:id" element={<ProductDetailPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/orders" element={<OrdersPage />} />
            <Route path="profile/orders/:id" element={<OrderDetailPage />} />
            <Route path="profile/settings" element={<SettingsPage />} />
            <Route path="profile/contacts" element={<ContactsPage />} />
            <Route path="profile/about" element={<StoreInfoPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
