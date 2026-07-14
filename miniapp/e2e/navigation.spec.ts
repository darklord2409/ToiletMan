import { expect, test } from "./fixtures";

test("bottom tab bar navigates between the five main sections", async ({ readyPage: page }) => {
  await expect(page.getByText("Главная")).toBeVisible();

  await page.getByText("Каталог", { exact: true }).click();
  await expect(page).toHaveURL(/\/catalog$/);

  await page.getByText("Избранное", { exact: true }).click();
  await expect(page).toHaveURL(/\/favorites$/);

  await page.getByText("Корзина", { exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);

  await page.getByText("Профиль", { exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
});

test("unauthenticated visit still renders the full app as a guest, not a blocking screen", async ({
  page,
}) => {
  // The chromium project preloads a valid customer token via storageState;
  // clearing it here simulates a plain-browser visit outside Telegram (or a
  // real Telegram client that never exposed usable initData, e.g. Telegram
  // Desktop) — the app must still render and be browsable rather than show
  // a hard "open in Telegram" block screen.
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText("Откройте в Telegram")).not.toBeVisible();
  await expect(page.getByText("Главная")).toBeVisible();
});
