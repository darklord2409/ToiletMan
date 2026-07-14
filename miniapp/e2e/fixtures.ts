import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Must match src/auth/tokenStorage.ts exactly.
export const ACCESS_TOKEN_KEY = "tipobot_customer_access_token";
export const REFRESH_TOKEN_KEY = "tipobot_customer_refresh_token";

export const test = base.extend<{ readyPage: Page }>({
  // Storage state (see global.setup.ts) already carries a valid customer
  // session, so this only needs to load the app and wait past the
  // Telegram-SDK-boot + auth-restore async sequence before interacting.
  readyPage: async ({ page }, use) => {
    await page.goto("/");
    // "Главная" (Home tab label, ru default) only ever renders once the
    // Telegram-SDK boot + auth-restore sequence resolves to "authenticated"
    // — the splash/guard screens never contain it.
    await expect(page.getByText("Главная")).toBeVisible();
    await use(page);
  },
});

export { expect };
