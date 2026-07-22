// Mirrors miniapp/src/lib/format.ts so prices read identically across the
// Mini App and the public website -- API money fields are Decimal
// serialized as strings, always route through here.
const CURRENCY_SYMBOLS: Record<string, string> = {
  UZS: "сум",
  USD: "$",
  EUR: "€",
  RUB: "₽",
};

export function formatMoney(value: string | number, currency = "UZS"): string {
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  if (Number.isNaN(amount)) return String(value);
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${formatted} ${symbol}`;
}

export function toNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function hasDiscount(price: string, compareAtPrice: string | null | undefined): boolean {
  if (!compareAtPrice) return false;
  return toNumber(compareAtPrice) > toNumber(price);
}

export function discountPercent(price: string, compareAtPrice: string | null | undefined): number {
  if (!hasDiscount(price, compareAtPrice) || !compareAtPrice) return 0;
  const original = toNumber(compareAtPrice);
  const current = toNumber(price);
  return Math.round(((original - current) / original) * 100);
}
