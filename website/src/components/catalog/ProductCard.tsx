import Link from "next/link";
import Image from "next/image";
import { absoluteMediaUrl } from "@/lib/media";
import { discountPercent, hasDiscount } from "@/lib/format";
import { PriceTag } from "@/components/ui/PriceTag";
import { Badge } from "@/components/ui/Badge";
import type { ProductListItem } from "@/types/api";
import type { Locale } from "@/i18n/locales";

export function ProductCard({
  product,
  locale,
  outOfStockLabel,
}: {
  product: ProductListItem;
  locale: Locale;
  outOfStockLabel: string;
}) {
  const translation = product.translations?.[locale];
  const name = translation?.name || product.name;
  const image = absoluteMediaUrl(product.primary_image_url);
  const discounted = hasDiscount(product.price, product.compare_at_price);
  const isOutOfStock = product.availability_status === "out_of_stock";

  return (
    <Link
      href={`/${locale}/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-l border border-line bg-surface-raised transition hover:border-brand/50 hover:shadow-lg hover:shadow-brand/10"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-box">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : null}
        {discounted ? (
          <div className="absolute left-2 top-2">
            <Badge tone="danger">-{discountPercent(product.price, product.compare_at_price)}%</Badge>
          </div>
        ) : null}
        {isOutOfStock ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Badge tone="muted">{outOfStockLabel}</Badge>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{name}</h3>
        <div className="mt-auto pt-1">
          <PriceTag price={product.price} compareAtPrice={product.compare_at_price} currency={product.currency} />
        </div>
      </div>
    </Link>
  );
}
