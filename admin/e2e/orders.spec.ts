import { E2E_PASSWORD, E2E_USERNAME, expect, test } from "./fixtures";
import { buildSignedInitData } from "./telegramAuth";

let seededOrderId: string | undefined;
let seededCustomerId: string | undefined;

// The orders list can legitimately be empty (e.g. right after a real bulk
// order-history wipe) — rather than depend on ambient DB state, seed one
// real order here via the actual customer-facing storefront API (real
// Telegram-signed login, real cart, real checkout), matching how the mini
// app's own cart-checkout e2e test creates orders.
test.beforeAll(async ({ request }) => {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    throw new Error("BOT_TOKEN env var is required to sign e2e Telegram initData");
  }
  const telegramUserId = 910_000_000 + Math.floor(Math.random() * 1_000_000);
  const initData = buildSignedInitData(botToken, telegramUserId);

  const loginRes = await request.post("/api/v1/customer-auth/telegram", {
    data: { init_data: initData },
  });
  const loginBody = await loginRes.json();
  const token = loginBody.access_token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const meRes = await request.get("/api/v1/customer-auth/me", { headers: authHeaders });
  seededCustomerId = (await meRes.json()).id;

  const productsRes = await request.get("/api/v1/storefront/products?page_size=1");
  const { items } = await productsRes.json();
  const productId = items[0].id;

  await request.post("/api/v1/storefront/cart/items", {
    headers: authHeaders,
    data: { product_id: productId, quantity: 1 },
  });

  const checkoutRes = await request.post("/api/v1/storefront/checkout", {
    headers: authHeaders,
    data: {
      contact_name: "Playwright Orders Seed",
      contact_phone: "+998900000000",
      delivery_method: "pickup",
    },
  });
  seededOrderId = (await checkoutRes.json()).id;
});

// Leave the shared dev database exactly as we found it — otherwise every
// run of this suite piles up one more order + customer indefinitely (this
// is exactly the clutter that got manually cleaned out of the dev DB once
// already).
test.afterAll(async ({ request }) => {
  if (!seededOrderId && !seededCustomerId) return;
  const loginRes = await request.post("/api/v1/auth/login", {
    form: { username: E2E_USERNAME, password: E2E_PASSWORD },
  });
  const { access_token: adminToken } = await loginRes.json();
  const authHeaders = { Authorization: `Bearer ${adminToken}` };

  if (seededOrderId) {
    await request.delete(`/api/v1/orders/${seededOrderId}`, { headers: authHeaders });
  }
  if (seededCustomerId) {
    await request.delete(`/api/v1/customers/${seededCustomerId}`, { headers: authHeaders });
  }
});

test("opening an order from the list shows customer, contact, and totals detail", async ({
  loggedInPage: page,
}) => {
  await page.getByRole("link", { name: "Заказы", exact: true }).click();
  await expect(page).toHaveURL("/commerce/orders");

  const firstRow = page.locator("tr[data-row-key]").first();
  await expect(firstRow).toBeVisible();
  await firstRow.getByRole("button", { name: "Открыть заказ" }).click();

  await expect(page).toHaveURL(/\/commerce\/orders\/[0-9a-f-]+$/);
  await expect(page.getByText("Клиент", { exact: true })).toBeVisible();
  await expect(page.getByText("Контакт для этого заказа")).toBeVisible();
  await expect(page.getByText("Статус и заметка менеджера")).toBeVisible();
  await expect(page.getByText("Сумма заказа")).toBeVisible();
  await expect(page.getByText("Товары в заказе")).toBeVisible();
  await expect(page.getByRole("button", { name: "Сохранить / подтвердить" })).toBeVisible();
});
