import { test, expect } from "./fixtures";

test("store settings form loads and a save round-trips through the API", async ({
  loggedInPage: page,
}) => {
  await page.getByRole("link", { name: "Настройки магазина" }).click();
  await expect(page).toHaveURL("/content/store-settings");

  const nameInput = page.getByLabel("Название магазина");
  await expect(nameInput).toBeVisible();

  const original = await nameInput.inputValue();
  const probeValue = `E2E Probe ${Date.now()}`;

  await nameInput.fill(probeValue);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText(/успешно обновлена/).last()).toBeVisible();
  await expect(nameInput).toHaveValue(probeValue);

  // Leave the shared dev database exactly as we found it.
  await nameInput.fill(original);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText(/успешно обновлена/).last()).toBeVisible();
});
