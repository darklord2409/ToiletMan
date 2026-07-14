import { test, expect } from "./fixtures";

test("'?' opens the keyboard shortcuts help modal", async ({ loggedInPage: page }) => {
  await page.keyboard.press("?");
  const modal = page.getByRole("dialog");
  await expect(modal.getByText("Горячие клавиши")).toBeVisible();
  await expect(modal.getByText("Ctrl/Cmd + K")).toBeVisible();
});

test("'g' then 'p' navigates to Products", async ({ loggedInPage: page }) => {
  await expect(page).toHaveURL("/");
  await page.keyboard.press("g");
  await page.keyboard.press("p");
  await expect(page).toHaveURL("/catalog/products");
});

test("'n' opens the create modal on a plain CRUD page", async ({ loggedInPage: page }) => {
  await page.getByRole("link", { name: "Производители" }).click();
  await expect(page).toHaveURL("/catalog/manufacturers");
  await expect(page.getByRole("heading", { name: "Производители" })).toBeVisible();

  await page.keyboard.press("n");
  const modal = page.getByRole("dialog");
  await expect(modal.getByLabel("Название")).toBeVisible();
});

test("right-click opens a row context menu with copy/edit/delete", async ({ loggedInPage: page }) => {
  await page.getByRole("link", { name: "Производители" }).click();
  await expect(page).toHaveURL("/catalog/manufacturers");
  // Reload once: the app is served by Vite's dev server with hot-reload, and
  // right after a page picks up a live HMR update the *next* client-side
  // navigation can occasionally land on a stale module graph — a plain
  // reload gets a fully fresh bundle before we drive this interaction.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Производители" })).toBeVisible();

  const firstRow = page.locator(".ant-table-tbody tr.ant-table-row").first();
  await expect(firstRow).toBeVisible();
  await page.evaluate(() => {
    document
      .querySelector(".ant-table-tbody tr.ant-table-row")
      ?.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 200, clientY: 200 }),
      );
  });

  const menu = page.getByRole("menu");
  await expect(menu.getByText("Копировать ID")).toBeVisible();
  await expect(menu.getByText("Редактировать")).toBeVisible();
  await expect(menu.getByText("Удалить", { exact: true })).toBeVisible();
});

test("column settings can hide and restore a column", async ({ loggedInPage: page }) => {
  await page.getByRole("link", { name: "Производители" }).click();
  await expect(page).toHaveURL("/catalog/manufacturers");

  const slugHeader = page.getByRole("columnheader", { name: "Слаг" });
  await expect(slugHeader).toBeVisible();

  await page.getByRole("button", { name: "Столбцы" }).click();
  await page.getByRole("checkbox", { name: "Слаг" }).uncheck();
  await expect(slugHeader).not.toBeVisible();

  await page.getByRole("button", { name: "Сбросить" }).click();
  await expect(slugHeader).toBeVisible();
});

test("switching language to English and back updates page text", async ({ loggedInPage: page }) => {
  // The outer .ant-select wrapper (not the inner search-input the combobox
  // role resolves to) is what's actually clickable — the visible selection
  // display sits on top of the input for pointer purposes.
  await page.getByLabel("Изменить язык").first().click();
  await page.locator(".ant-select-dropdown").getByText("English").click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByLabel("Change language").first().click();
  await page.locator(".ant-select-dropdown").getByText("Русский").click();
  await expect(page.getByRole("heading", { name: "Панель управления" })).toBeVisible();
});
