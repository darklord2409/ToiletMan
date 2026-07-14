import { test as setup, expect } from "@playwright/test";

import { E2E_PASSWORD, E2E_USERNAME } from "./fixtures";

const authFile = "e2e/.auth/user.json";

// Logs in once via the real UI and persists the resulting session
// (localStorage JWTs) so every other spec can start pre-authenticated
// instead of hitting the login endpoint itself — which is rate-limited to
// RATE_LIMIT_LOGIN_PER_MINUTE (5/min), well under what a full suite of
// UI-driven tests would otherwise burn through.
setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("admin").fill(E2E_USERNAME);
  await page.getByPlaceholder("••••••••").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Панель управления" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
