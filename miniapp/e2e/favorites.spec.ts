import { expect, test } from "./fixtures";

test("toggling a product's favorite heart adds and removes it from Favorites", async ({ readyPage: page }) => {
  await page.goto("/catalog");
  const firstCard = page.getByTestId("product-card").first();
  await expect(firstCard).toBeVisible();
  const productId = await firstCard.getAttribute("data-product-id");

  await firstCard.getByRole("button", { name: "favorite" }).click();

  await page.getByText("Избранное", { exact: true }).click();
  await expect(page).toHaveURL(/\/favorites$/);
  await expect(page.locator(`[data-product-id="${productId}"]`)).toBeVisible();

  await page.locator(`[data-product-id="${productId}"]`).getByRole("button", { name: "favorite" }).click();
  await expect(page.locator(`[data-product-id="${productId}"]`)).toHaveCount(0);
});
