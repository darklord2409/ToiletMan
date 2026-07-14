import { expect, test } from "./fixtures";

test("catalog lists products and opens a product detail page", async ({ readyPage: page }) => {
  await page.goto("/catalog");
  const firstCard = page.getByTestId("product-card").first();
  await expect(firstCard).toBeVisible();

  const productId = await firstCard.getAttribute("data-product-id");
  await firstCard.click();

  await expect(page).toHaveURL(new RegExp(`/product/${productId}$`));
  await expect(page.getByTestId("add-to-cart-button")).toBeVisible();
});

test("sort action sheet opens and applies a sort option", async ({ readyPage: page }) => {
  await page.goto("/catalog");
  const sortTrigger = page.getByTestId("sort-trigger");
  await expect(sortTrigger).toHaveText("Сначала новые");

  await sortTrigger.click();
  const priceAscOption = page.getByText("Сначала дешевле", { exact: true });
  await expect(priceAscOption).toBeVisible();
  await expect(page.getByText("Сначала дороже", { exact: true })).toBeVisible();

  await priceAscOption.click();
  await expect(sortTrigger).toHaveText("Сначала дешевле");
});

test("home quick links lead into the catalog", async ({ readyPage: page }) => {
  await page.goto("/");
  await page.getByText("Поиск товаров...").click();
  await expect(page).toHaveURL(/\/search$/);
});
