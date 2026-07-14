import crypto from "node:crypto";

/**
 * Builds a validly-signed Telegram WebApp `initData` string using the same
 * algorithm as `backend/app/core/telegram.py::verify_init_data` — mirrors
 * `miniapp/e2e/telegramAuth.ts`. Used here only to seed a real order via the
 * real storefront checkout API (as a customer), so `orders.spec.ts` doesn't
 * depend on ambient DB state that may or may not still exist.
 */
export function buildSignedInitData(botToken: string, telegramUserId: number): string {
  const user = {
    id: telegramUserId,
    first_name: "Playwright",
    last_name: "OrdersSeed",
    username: `playwright_e2e_orders_${telegramUserId}`,
    language_code: "ru",
  };

  const params: Record<string, string> = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: `AAF${telegramUserId}`,
    user: JSON.stringify(user),
  };

  const dataCheckString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return new URLSearchParams({ ...params, hash }).toString();
}
