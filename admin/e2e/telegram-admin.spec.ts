import { test, expect } from "./fixtures";

test("bot settings form loads and a save round-trips through the API", async ({
  loggedInPage: page,
}) => {
  await page.getByRole("link", { name: "Настройки Telegram-бота" }).click();
  await expect(page).toHaveURL("/content/bot-settings");

  // Deliberately NOT bot_name: saving it calls the real, strictly
  // rate-limited Telegram `setMyName` API (see StoreSettingsService.update),
  // and hammering that on every e2e run can exhaust the rate limit for
  // hours and block real admin use — confirmed the hard way (429 "retry
  // after 82371s"). menu_button_text round-trips through the exact same
  // PATCH /settings endpoint with zero external side effects.
  const menuButtonCard = page.locator(".ant-card", { has: page.getByText("Кнопка меню", { exact: true }) });
  const menuButtonInput = menuButtonCard.locator("input:visible").first();
  await expect(menuButtonInput).toBeVisible();

  const original = await menuButtonInput.inputValue();
  const probeValue = `Probe ${Date.now()}`.slice(0, 16);

  await menuButtonInput.fill(probeValue);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText(/успешно обновлена/).last()).toBeVisible();
  await expect(menuButtonInput).toHaveValue(probeValue);

  // Leave the shared dev database exactly as we found it.
  await menuButtonInput.fill(original);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText(/успешно обновлена/).last()).toBeVisible();
});

test("product recommendations page loads its table", async ({ loggedInPage: page }) => {
  await page.getByRole("link", { name: "Рекомендации товаров" }).click();
  await expect(page).toHaveURL("/catalog/product-recommendations");
  await expect(page.getByRole("heading", { name: "Рекомендации товаров" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});

test("analytics dashboard renders its widgets", async ({ loggedInPage: page }) => {
  await page.getByRole("link", { name: "Аналитика" }).click();
  await expect(page).toHaveURL("/system/analytics");
  await expect(page.getByRole("heading", { name: "Аналитика" })).toBeVisible();
  await expect(page.getByText("Самые просматриваемые товары")).toBeVisible();
  await expect(page.getByText("Популярные категории")).toBeVisible();
});

test("media library loads and exposes an upload control", async ({ loggedInPage: page }) => {
  await page.getByRole("link", { name: "Медиатека" }).click();
  await expect(page).toHaveURL("/system/uploaded-files");
  await expect(page.getByRole("heading", { name: "Медиатека" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Загрузить" })).toBeVisible();
});
