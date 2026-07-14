import { expect, test } from "@playwright/test";

import { ACCESS_TOKEN_KEY } from "./fixtures";
import { buildSignedInitData } from "./telegramAuth";

// Matches admin/e2e/fixtures.ts — a fixed, checked-in dev-only superuser used
// purely to clean up e2e-seeded rows, not a real credential.
const ADMIN_USERNAME = "playwright_e2e";
const ADMIN_PASSWORD = "PlaywrightE2E!2026";

// This file must NOT inherit the project's shared storageState (a customer
// already logged in from global.setup.ts, reused by every other spec) — this
// test needs to log in fresh via its own Telegram launch hash, and must not
// risk mutating/deleting the shared customer other test files depend on.
test.use({ storageState: { cookies: [], origins: [] } });

// Real Telegram launches pass a signed initData payload via the URL hash
// (`tgWebAppData`) — replicate that here (instead of presetting tokens in
// localStorage like fixtures.ts's readyPage) so the app's own `isTelegram`
// detection genuinely turns on, exactly as it would for a real mobile client.
//
// @telegram-apps/sdk's launch-params schema requires a `signature` field
// inside tgWebAppData (added for its own Ed25519 checks) even though our
// backend's HMAC verification never looks at it — without it, parsing the
// whole launch-params blob throws and isTelegram silently stays false. Any
// string satisfies the schema; it just has to be included in the signed
// payload consistently so the backend's hash check still matches.
function buildLaunchHash(botToken: string, telegramUserId: number): string {
  const initData = buildSignedInitData(botToken, telegramUserId, { signature: "e2e-phone-gate" });
  const params = new URLSearchParams({
    tgWebAppData: initData,
    tgWebAppVersion: "7.10",
    tgWebAppPlatform: "android",
    tgWebAppThemeParams: JSON.stringify({ bg_color: "#ffffff" }),
  });
  return params.toString();
}

let createdCustomerId: string | undefined;

test.afterEach(async ({ request }) => {
  if (!createdCustomerId) return;
  const loginRes = await request.post("/api/v1/auth/login", {
    form: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  const { access_token: adminToken } = await loginRes.json();
  await request.delete(`/api/v1/customers/${createdCustomerId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  createdCustomerId = undefined;
});

test("a fresh Telegram customer without a phone number is blocked until they share or enter one", async ({
  page,
}) => {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    throw new Error("BOT_TOKEN env var is required to sign e2e Telegram initData");
  }
  const telegramUserId = 930_000_000 + Math.floor(Math.random() * 1_000_000);

  // @telegram-apps/sdk's `init()` doesn't just parse the launch-params hash —
  // it also runs its own `isTMA()` environment sanity check, which (for a
  // plain browser tab with no real Telegram parent window) tries an async
  // postMessage handshake and times out. Real native Telegram clients expose
  // `window.TelegramWebviewProxy` as their message bridge, which short-
  // circuits that check to true synchronously; stubbing it here is the same
  // trick the SDK's own `mockTelegramEnv` test helper relies on.
  await page.addInitScript(() => {
    (window as unknown as { TelegramWebviewProxy: unknown }).TelegramWebviewProxy = {
      postEvent: () => undefined,
    };
  });
  await page.goto(`/#${buildLaunchHash(botToken, telegramUserId)}`);

  await expect(page.getByText("Нужен номер телефона")).toBeVisible();
  await expect(page.getByText("Главная")).not.toBeVisible();

  // Derived from telegramUserId so repeated runs never collide on phone
  // uniqueness with a previous run's (soft-deleted, but still unique-locked)
  // customer row.
  const phone = `+9989${String(telegramUserId).slice(-8)}`;
  await page.getByPlaceholder("+998 90 123 45 67").fill(phone);
  await page.getByRole("button", { name: "Сохранить" }).click();

  await expect(page.getByText("Главная")).toBeVisible();

  createdCustomerId = await page.evaluate(async (tokenKey) => {
    const token = localStorage.getItem(tokenKey);
    const res = await fetch("/api/v1/customer-auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = await res.json();
    return me.id as string;
  }, ACCESS_TOKEN_KEY);
});
