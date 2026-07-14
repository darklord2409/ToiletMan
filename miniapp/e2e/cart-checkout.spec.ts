import { expect, test } from "./fixtures";

test("add to cart, checkout with pickup, and land on the confirmed order", async ({ readyPage: page }) => {
  await page.goto("/catalog");
  const firstCard = page.getByTestId("product-card").first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();

  await expect(page.getByTestId("add-to-cart-button")).toBeEnabled();
  await page.getByTestId("add-to-cart-button").click();
  await expect(page.getByText("Добавлено в корзину")).toBeVisible();

  // The bottom tab bar (and its cart badge) only renders on tab-root
  // screens — the product detail page we're still on isn't one.
  await page.goto("/");
  await expect(page.getByTestId("cart-badge")).toHaveAttribute("data-count", "1");

  await page.getByText("Корзина", { exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("go-to-checkout-button")).toBeVisible();

  await page.getByTestId("go-to-checkout-button").click();
  await expect(page).toHaveURL(/\/checkout$/);

  await page.getByTestId("checkout-name-input").locator("input").fill("Playwright Buyer");
  await page.getByTestId("checkout-phone-input").locator("input").fill("+998901234567");
  await page.getByPlaceholder("Необязательно").fill("Please call before delivery");
  // Pickup is the default delivery method — no address field should be
  // required, so submitting immediately after contact details must succeed.
  await page.getByTestId("checkout-submit-button").click();

  await expect(page).toHaveURL(/\/profile\/orders\/[0-9a-f-]+$/);
  await expect(page.getByText("Заказ оформлен!")).toBeVisible();

  // The customer's own checkout comment surfaces back on the order detail page.
  await expect(page.getByText("Ваш комментарий")).toBeVisible();
  await expect(page.getByText("Please call before delivery")).toBeVisible();

  await page.getByText("Продолжить покупки").click();
  await expect(page).toHaveURL("/");
});

test("clearing the cart shows a localized confirm dialog, not antd-mobile's Chinese default", async ({
  readyPage: page,
}) => {
  await page.goto("/catalog");
  await page.getByTestId("product-card").first().click();
  await page.getByTestId("add-to-cart-button").click();
  await page.getByText("Добавлено в корзину").waitFor();

  await page.goto("/cart");
  await page.getByText("Очистить корзину", { exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Очистить корзину?")).toBeVisible();
  await expect(dialog.getByText("Подтвердить", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Отмена", { exact: true })).toBeVisible();
  // Antd-mobile's own untranslated defaults would read "确定"/"取消" here.
  await expect(dialog.getByText("确定")).toHaveCount(0);
  await expect(dialog.getByText("取消")).toHaveCount(0);

  await dialog.getByText("Подтвердить", { exact: true }).click();
  await expect(page.getByText("Корзина пуста", { exact: false })).toBeVisible();
});

test("checkout requires an address when delivery method is 'delivery'", async ({ readyPage: page }) => {
  await page.goto("/catalog");
  await page.getByTestId("product-card").first().click();
  await page.getByTestId("add-to-cart-button").click();
  await page.getByText("Добавлено в корзину").waitFor();

  await page.goto("/checkout");
  await page.getByTestId("checkout-name-input").locator("input").fill("Playwright Buyer");
  await page.getByTestId("checkout-phone-input").locator("input").fill("+998901234567");
  await page.getByTestId("delivery-method-delivery").click();
  await page.getByTestId("checkout-submit-button").click();

  await expect(page.getByText("Введите адрес доставки")).toBeVisible();
  await expect(page).toHaveURL(/\/checkout$/);
});
