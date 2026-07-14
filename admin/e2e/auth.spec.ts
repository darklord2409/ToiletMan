import { test, expect } from "./fixtures";
import { E2E_USERNAME, E2E_PASSWORD } from "./fixtures";

// These two tests exercise the login UI itself, so they need to start
// logged out — overriding the project's default storageState (see
// global.setup.ts / playwright.config.ts), which every other spec relies on
// to skip a real login (rate-limited to 5/min) per test.
test.use({ storageState: { cookies: [], origins: [] } });

test("shows an error on invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("admin").fill(E2E_USERNAME);
  await page.getByPlaceholder("••••••••").fill("definitely-wrong-password");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("logs in, reaches the dashboard, and logs out", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("admin").fill(E2E_USERNAME);
  await page.getByPlaceholder("••••••••").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("TipoBot Admin")).toBeVisible();

  await page.getByText(E2E_USERNAME).click();
  await page.getByText("Выйти").click();
  await expect(page).toHaveURL(/\/login/);
});
