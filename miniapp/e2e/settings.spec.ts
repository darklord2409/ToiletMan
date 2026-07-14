import { expect, test } from "./fixtures";

test("switching theme updates the document's color-scheme attribute", async ({ readyPage: page }) => {
  await page.goto("/profile/settings");

  await page.getByText("Тёмная", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-prefers-color-scheme", "dark");

  await page.getByText("Светлая", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-prefers-color-scheme", "light");
});

test("switching language updates visible UI text", async ({ readyPage: page }) => {
  await page.goto("/profile/settings");
  await expect(page.getByText("Настройки", { exact: true })).toBeVisible();

  // Language rows render as "<flag> <label>" in one text node, so an exact
  // match against the label alone won't hit — match the substring instead.
  await page.getByText("English", { exact: false }).click();
  await expect(page.getByText("Settings", { exact: true })).toBeVisible();

  // Switch back so later tests in the same storage state see Russian again.
  await page.getByText("Русский", { exact: false }).click();
  await expect(page.getByText("Настройки", { exact: true })).toBeVisible();
});

test("notification preference toggle round-trips through the API", async ({ readyPage: page }) => {
  await page.goto("/profile/settings");

  const toggle = page.getByText("Статусы заказов через Telegram").locator("..").getByRole("switch");
  const wasChecked = (await toggle.getAttribute("aria-checked")) === "true";

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", String(!wasChecked));

  await page.reload();
  const toggleAfterReload = page
    .getByText("Статусы заказов через Telegram")
    .locator("..")
    .getByRole("switch");
  await expect(toggleAfterReload).toHaveAttribute("aria-checked", String(!wasChecked));

  // Leave the shared dev customer's preference exactly as we found it.
  await toggleAfterReload.click();
  await expect(toggleAfterReload).toHaveAttribute("aria-checked", String(wasChecked));
});
