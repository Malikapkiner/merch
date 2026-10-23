import { expect, test } from "@playwright/test";

test("the header lists the Categories and the Varsayılan Varyant goes to the cart from the card", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Ana gezinme" }).getByRole("link", { name: "Zeytinyağı" })).toBeVisible();

  await page.goto("/urunler");
  const card = page.getByRole("article").filter({ hasText: "Erken Hasat Zeytinyağı" });
  await expect(card.getByText("500 ml cam şişe")).toBeVisible();
  await card.getByRole("button", { name: "Sepete ekle" }).click();
  await expect(page.getByRole("link", { name: "Sepet, 1 ürün" })).toBeVisible();
});

test("a Product with no stock shows Tükendi instead of an add-to-cart button", async ({ page }) => {
  await page.goto("/urunler");
  const card = page.getByRole("article").filter({ hasText: "Tükenen Zeytin" });
  await expect(card.getByText("Tükendi")).toBeVisible();
  await expect(card.getByRole("button")).toHaveCount(0);
});
