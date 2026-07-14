import { test as setup } from "@playwright/test";

import { buildSignedInitData } from "./telegramAuth";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./fixtures";

const authFile = "e2e/.auth/customer.json";

// No backend test-only auth bypass exists (nor should one) — this signs a
// real Telegram `initData` payload with the same BOT_TOKEN the backend
// verifies against, so the customer token comes from the actual HMAC
// handshake (see backend/app/core/telegram.py::verify_init_data), not a
// mock. A fresh random telegram_id per run means every e2e run starts as a
// brand-new customer with an empty cart/favorites/order history.
setup("authenticate", async ({ page, request, baseURL }) => {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    throw new Error("BOT_TOKEN env var is required to sign e2e Telegram initData");
  }

  const telegramUserId = 900_000_000 + Math.floor(Math.random() * 1_000_000);
  const initData = buildSignedInitData(botToken, telegramUserId);

  const response = await request.post(`${baseURL}/api/v1/customer-auth/telegram`, {
    data: { init_data: initData },
  });
  if (!response.ok()) {
    throw new Error(`Telegram auth handshake failed: ${response.status()} ${await response.text()}`);
  }
  const tokens = (await response.json()) as { access_token: string; refresh_token: string };

  await page.goto("/");
  await page.evaluate(
    ([key, access, refreshKey, refresh]) => {
      localStorage.setItem(key, access);
      localStorage.setItem(refreshKey, refresh);
    },
    [ACCESS_TOKEN_KEY, tokens.access_token, REFRESH_TOKEN_KEY, tokens.refresh_token],
  );

  await page.context().storageState({ path: authFile });
});
