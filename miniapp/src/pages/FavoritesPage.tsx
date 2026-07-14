import { SpinLoading } from "antd-mobile";
import { HeartOutline } from "antd-mobile-icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ProductGrid } from "@/components/ProductRow";
import { EmptyState } from "@/components/EmptyState";
import { useFavorites } from "@/hooks/useFavorites";

export default function FavoritesPage() {
  const { t } = useTranslation("favorites");
  const navigate = useNavigate();
  const { data, isLoading } = useFavorites();

  return (
    <div className="scroll-page">
      <div style={{ padding: "12px 12px 0" }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{t("title")}</h2>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <SpinLoading />
        </div>
      ) : data && data.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <ProductGrid products={data.map((f) => f.product)} />
        </div>
      ) : (
        <EmptyState
          icon={<HeartOutline fontSize={48} color="var(--adm-color-weak)" />}
          title={t("empty.title")}
          description={t("empty.description")}
          actionLabel={t("empty.action")}
          onAction={() => navigate("/catalog")}
        />
      )}
    </div>
  );
}
