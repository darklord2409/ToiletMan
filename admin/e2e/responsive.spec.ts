import { test, expect } from "./fixtures";

test.use({ viewport: { width: 375, height: 812 } });

test("sidebar is off-canvas by default on a phone-sized viewport and opens as an overlay", async ({
  loggedInPage: page,
}) => {
  const sidebarHeading = page.getByText("TipoBot Admin", { exact: true });
  await expect(sidebarHeading).toBeHidden();

  await page.getByRole("button", { name: "Свернуть/развернуть боковую панель" }).click();
  await expect(sidebarHeading).toBeVisible();

  await page.getByRole("link", { name: "Товары", exact: true }).click();
  await expect(page).toHaveURL("/catalog/products");
  await expect(sidebarHeading).toBeHidden();
});

test("header controls stay within the viewport on a phone-sized screen", async ({
  loggedInPage: page,
}) => {
  const viewportWidth = 375;
  for (const testId of ["header-search-trigger", "header-actions"]) {
    const box = await page.getByTestId(testId).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth);
  }
});
