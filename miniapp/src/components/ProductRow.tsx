import type { ReactNode } from "react";

import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";

interface ProductRowProps {
  title: string;
  seeAllLabel?: string;
  onSeeAll?: () => void;
  products: ProductCardData[];
  emptyFallback?: ReactNode;
}

export function ProductRow({ title, seeAllLabel, onSeeAll, products, emptyFallback }: ProductRowProps) {
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const favoriteIds = new Set(favorites?.map((f) => f.product.id));

  if (products.length === 0) {
    return emptyFallback ? <>{emptyFallback}</> : null;
  }

  return (
    <section style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          marginBottom: 10,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        {seeAllLabel && onSeeAll && (
          <span
            role="button"
            onClick={onSeeAll}
            style={{ fontSize: 13, color: "var(--adm-color-primary)", cursor: "pointer" }}
          >
            {seeAllLabel}
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: "0 12px",
          scrollSnapType: "x mandatory",
        }}
      >
        {products.map((product) => (
          <div key={product.id} style={{ flex: "0 0 140px", scrollSnapAlign: "start" }}>
            <ProductCard
              product={product}
              isFavorite={favoriteIds.has(product.id)}
              onToggleFavorite={(id) => toggleFavorite.mutate(id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const favoriteIds = new Set(favorites?.map((f) => f.product.id));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10,
        padding: "0 12px",
      }}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFavorite={favoriteIds.has(product.id)}
          onToggleFavorite={(id) => toggleFavorite.mutate(id)}
        />
      ))}
    </div>
  );
}
