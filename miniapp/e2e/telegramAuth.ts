import crypto from "node:crypto";

/**
 * Builds a validly-signed Telegram WebApp `initData` string using the same
 * algorithm as `backend/app/core/telegram.py::verify_init_data` —
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * This lets e2e tests exercise the real `/customer-auth/telegram` HMAC
 * verification path (no backend test-only bypass exists, nor should one)
 * instead of mocking Telegram out of the picture entirely.
 */
export function buildSignedInitData(
  botToken: string,
  telegramUserId: number,
  extraFields: Record<string, string> = {},
): string {
  const user = {
    id: telegramUserId,
    first_name: "Playwright",
    last_name: "E2E",
    username: `playwright_e2e_${telegramUserId}`,
    language_code: "ru",
  };

  const params: Record<string, string> = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: `AAF${telegramUserId}`,
    user: JSON.stringify(user),
    ...extraFields,
  };

  const dataCheckString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return new URLSearchParams({ ...params, hash }).toString();
}
