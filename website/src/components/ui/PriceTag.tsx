import { formatMoney, hasDiscount } from "@/lib/format";

export function PriceTag({
  price,
  compareAtPrice,
  currency = "UZS",
  size = "small",
}: {
  price: string;
  compareAtPrice?: string | null;
  currency?: string;
  size?: "small" | "large";
}) {
  const discounted = hasDiscount(price, compareAtPrice);
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span
        className={
          (size === "large" ? "text-2xl" : "text-base") +
          " font-bold " +
          (discounted ? "text-red-400" : "text-brand-light")
        }
      >
        {formatMoney(price, currency)}
      </span>
      {discounted && compareAtPrice ? (
        <span className={(size === "large" ? "text-sm" : "text-xs") + " text-ink-muted line-through"}>
          {formatMoney(compareAtPrice, currency)}
        </span>
      ) : null}
    </div>
  );
}
