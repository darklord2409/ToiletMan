import { test, expect } from "./fixtures";

test("products list loads, search filters, and the editor opens with its tabs", async ({
  loggedInPage: page,
}) => {
  await page.getByRole("link", { name: "Товары", exact: true }).click();
  await expect(page).toHaveURL("/catalog/products");
  await expect(page.getByRole("heading", { name: "Товары" })).toBeVisible();

  const rows = page.locator(".ant-table-tbody tr.ant-table-row");
  await expect(rows.first()).toBeVisible({ timeout: 15000 });
  const initialCount = await rows.count();
  expect(initialCount).toBeGreaterThan(0);

  await page.getByPlaceholder("Поиск...").fill("zzz-no-such-product-zzz");
  await page.getByPlaceholder("Поиск...").press("Enter");
  await expect(page.locator(".ant-empty")).toBeVisible();

  await page.getByPlaceholder("Поиск...").fill("");
  await page.getByPlaceholder("Поиск...").press("Enter");
  await expect(rows.first()).toBeVisible();

  await page.getByRole("button", { name: /Добавить/ }).click();
  await expect(page).toHaveURL("/catalog/products/new");

  for (const tabName of ["Общее", "Переводы", "Цены", "Склад", "SEO"]) {
    await expect(page.getByRole("tab", { name: tabName })).toBeVisible();
  }
  await expect(page.getByLabel("Артикул")).toBeVisible();
  await expect(page.getByLabel("Название")).toBeVisible();
});
