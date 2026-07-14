// API money fields are Decimal serialized as strings (see @/types/entities
// header comment) — always route through here rather than templating the
// raw string, so thousands separators/decimals render consistently.
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  UZS: "сум",
  USD: "$",
  EUR: "€",
  RUB: "₽",
};

// Display-only USD conversion rate, distinct from the rate actually used to
// price products in UZS at import time — this is purely for showing an
// approximate dollar figure to shoppers, not for any real money calculation.
export const DISPLAY_USD_RATE = 12000;

export function formatUsdApprox(value: string | number, rate = DISPLAY_USD_RATE): string {
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount / rate);
}

export function toNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function hasDiscount(price: string, compareAtPrice: string | null): boolean {
  if (!compareAtPrice) return false;
  return toNumber(compareAtPrice) > toNumber(price);
}

export function discountPercent(price: string, compareAtPrice: string | null): number {
  if (!hasDiscount(price, compareAtPrice) || !compareAtPrice) return 0;
  const original = toNumber(compareAtPrice);
  const current = toNumber(price);
  return Math.round(((original - current) / original) * 100);
}
