import { test, expect } from "./fixtures";
import { E2E_USERNAME } from "./fixtures";

test("sessions modal lists the current session for a user", async ({ loggedInPage: page }) => {
  await page.getByRole("link", { name: "Администраторы" }).click();
  await expect(page).toHaveURL("/users/admin-users");

  const row = page.getByRole("row", { name: new RegExp(E2E_USERNAME) });
  await expect(row).toBeVisible();
  await row.getByTitle("Сессии").click();

  const modal = page.getByRole("dialog");
  await expect(modal.getByText(`Сессии: ${E2E_USERNAME}`)).toBeVisible();
  await expect(modal.locator(".ant-table-tbody tr.ant-table-row").first()).toBeVisible();

  await modal.getByRole("button", { name: "Закрыть" }).click();
  await expect(modal).not.toBeVisible();
});
