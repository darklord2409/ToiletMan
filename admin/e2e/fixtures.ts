import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export const E2E_USERNAME = "playwright_e2e";
export const E2E_PASSWORD = "PlaywrightE2E!2026";

export const test = base.extend<{ loggedInPage: Page }>({
  // Storage state (see global.setup.ts) already carries a valid session, so
  // this only needs to load the app and wait for it to be fully mounted —
  // notably before firing any keyboard shortcuts, since the global "?"/"g"
  // listener attaches in an effect a tick after the URL itself changes.
  loggedInPage: async ({ page }, use) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Панель управления" })).toBeVisible();
    await use(page);
  },
});

export { expect };
