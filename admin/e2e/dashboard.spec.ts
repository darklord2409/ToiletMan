import { test, expect } from "./fixtures";

test("dashboard renders its core widgets", async ({ loggedInPage: page }) => {
  await expect(page.getByRole("heading", { name: "Панель управления" })).toBeVisible();

  const main = page.locator("main");

  // Stat cards (scoped to <main> — several of these labels also appear as
  // sidebar nav links, so matching against the whole page would be ambiguous).
  await expect(main.getByText("Выручка за 30 дней")).toBeVisible();
  await expect(main.getByText("Заказы", { exact: true })).toBeVisible();
  await expect(main.getByText("Товары", { exact: true })).toBeVisible();
  await expect(main.getByText("Покупатели", { exact: true })).toBeVisible();

  // Sales chart + table widgets
  await expect(main.getByText("Динамика продаж")).toBeVisible();
  await expect(main.getByText("Популярные товары")).toBeVisible();
  await expect(main.getByText("Новые товары")).toBeVisible();
});

test("dark mode toggle flips the theme switch", async ({ loggedInPage: page }) => {
  const toggle = page.getByRole("switch", { name: /тёмную тему/i });
  await expect(toggle).toBeVisible();

  const before = await toggle.getAttribute("aria-checked");
  await toggle.click();
  await expect(toggle).not.toHaveAttribute("aria-checked", before ?? "false");
});
