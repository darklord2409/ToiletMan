import { formatMoney, formatUsdApprox, hasDiscount } from "@/lib/format";

interface PriceTagProps {
  price: string;
  compareAtPrice?: string | null;
  currency?: string;
  size?: "small" | "large";
  /** Also show the exact currency amount (e.g. "≈ 463 600 сум") below the USD price. */
  showApprox?: boolean;
}

export function PriceTag({
  price,
  compareAtPrice,
  currency = "UZS",
  size = "small",
  showApprox = false,
}: PriceTagProps) {
  const discounted = hasDiscount(price, compareAtPrice ?? null);
  const display = currency === "UZS" ? formatUsdApprox(price) : formatMoney(price, currency);
  const displayCompare =
    compareAtPrice && (currency === "UZS" ? formatUsdApprox(compareAtPrice) : formatMoney(compareAtPrice, currency));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: size === "large" ? 24 : 15,
            color: discounted ? "var(--adm-color-danger)" : "var(--adm-color-primary)",
          }}
        >
          {display}
        </span>
        {discounted && displayCompare && (
          <span
            style={{
              fontSize: size === "large" ? 14 : 12,
              color: "var(--adm-color-weak)",
              textDecoration: "line-through",
            }}
          >
            {displayCompare}
          </span>
        )}
      </div>
      {showApprox && currency === "UZS" && (
        <span style={{ fontSize: size === "large" ? 13 : 11, color: "var(--adm-color-weak)" }}>
          ≈ {formatMoney(price, "UZS")}
        </span>
      )}
    </div>
  );
}
