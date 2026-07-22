import { ProductCard } from "@/components/catalog/ProductCard";
import type { ProductListItem } from "@/types/api";
import type { Locale } from "@/i18n/locales";

export function ProductGrid({
  products,
  locale,
  outOfStockLabel,
  emptyLabel,
}: {
  products: ProductListItem[];
  locale: Locale;
  outOfStockLabel: string;
  emptyLabel?: string;
}) {
  if (products.length === 0) {
    return emptyLabel ? <p className="py-10 text-center text-slate-400">{emptyLabel}</p> : null;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} locale={locale} outOfStockLabel={outOfStockLabel} />
      ))}
    </div>
  );
}
