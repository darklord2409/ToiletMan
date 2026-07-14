import { Image } from "antd-mobile";
import { HeartFill, HeartOutline } from "antd-mobile-icons";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { PriceTag } from "@/components/PriceTag";
import { discountPercent } from "@/lib/format";
import { useAuth } from "@/auth/AuthContext";
import { useHaptics } from "@/telegram/hooks";
import type { AvailabilityStatus } from "@/types/entities";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  price: string;
  compare_at_price: string | null;
  primary_image_url: string | null;
  availability_status: AvailabilityStatus;
  currency?: string;
}

interface ProductCardProps {
  product: ProductCardData;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  style?: CSSProperties;
}

export function ProductCard({ product, isFavorite, onToggleFavorite, style }: ProductCardProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { status } = useAuth();
  const haptics = useHaptics();
  const percent = discountPercent(product.price, product.compare_at_price);
  const outOfStock = product.availability_status === "out_of_stock";

  return (
    <div
      role="button"
      data-testid="product-card"
      data-product-id={product.id}
      className="product-card"
      onClick={() => navigate(`/product/${product.id}`)}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--adm-color-box)",
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      <div style={{ position: "relative", aspectRatio: "1 / 1", background: "var(--adm-color-fill)" }}>
        <Image
          src={product.primary_image_url ?? undefined}
          fit="cover"
          width="100%"
          height="100%"
          lazy
          placeholder={<div style={{ width: "100%", height: "100%", background: "var(--adm-color-fill)" }} />}
          fallback={<div style={{ width: "100%", height: "100%", background: "var(--adm-color-fill)" }} />}
        />
        {percent > 0 && (
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "var(--adm-color-danger)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 20,
              padding: "3px 9px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            }}
          >
            -{percent}%
          </span>
        )}
        {outOfStock && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(1px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {t("stock.outOfStock")}
          </div>
        )}
        {status === "authenticated" && onToggleFavorite && (
          <button
            type="button"
            aria-label="favorite"
            onClick={(e) => {
              e.stopPropagation();
              haptics.selection();
              onToggleFavorite(product.id);
            }}
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 30,
              height: 30,
              border: "none",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: "var(--adm-color-danger)",
            }}
          >
            {isFavorite ? <HeartFill /> : <HeartOutline />}
          </button>
        )}
      </div>
      <div style={{ padding: "10px 10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontSize: 13,
            lineHeight: 1.35,
            height: "2.7em",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            color: "var(--adm-color-text)",
          }}
        >
          {product.name}
        </span>
        <PriceTag price={product.price} compareAtPrice={product.compare_at_price} currency={product.currency} />
      </div>
    </div>
  );
}
