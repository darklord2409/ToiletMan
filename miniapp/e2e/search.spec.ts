import { expect, test } from "./fixtures";

test("search finds products by typing and remembers the query in history", async ({ readyPage: page }) => {
  await page.goto("/catalog");
  const firstCard = page.getByTestId("product-card").first();
  const productName = (await firstCard.locator("span").first().textContent())?.trim() ?? "";
  expect(productName.length).toBeGreaterThan(0);

  await page.goto("/search");
  const searchInput = page.locator("input").first();
  const uniqueFragment = productName.split(" ")[0];
  await searchInput.fill(uniqueFragment);

  await expect(page.getByTestId("product-card").first()).toBeVisible({ timeout: 5000 });
  await searchInput.press("Enter");

  await page.goto("/search");
  await expect(page.getByText(uniqueFragment)).toBeVisible();
});

test("search shows a no-results message for a nonsense query", async ({ readyPage: page }) => {
  await page.goto("/search");
  await page.locator("input").first().fill("zzzznoproductmatchesthisxyz");
  await expect(page.getByText(/Ничего не найдено/)).toBeVisible({ timeout: 5000 });
});
