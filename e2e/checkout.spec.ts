import { expect, test } from "@playwright/test";

test("a Customer buys a Product with a card: catalog, cart, checkout, payment, confirmation", async ({ page }) => {
  await page.goto("/urunler");
  await page.getByRole("link", { name: /Erken Hasat Zeytinyağı/ }).first().click();
  await page.getByRole("button", { name: "Sepete ekle" }).click();
  await expect(page.getByRole("status")).toContainText("Sepete eklendi");

  await page.goto("/sepet");
  await expect(page.getByText("500 ml cam şişe")).toBeVisible();
  await page.getByRole("link", { name: /Ödemeye geç/ }).first().click();
  await expect(page).toHaveURL(/\/odeme$/);

  await page.getByLabel("E-posta").fill("musteri@example.com");
  await page.getByLabel("Telefon").fill("0532 123 45 67");
  await page.getByLabel("Ad soyad").fill("Ayşe Yılmaz");
  await page.getByLabel("İl", { exact: true }).selectOption("İstanbul");
  await page.getByLabel("İlçe", { exact: true }).selectOption("Kadıköy");
  await page.getByLabel("Mahalle").fill("Caferağa");
  await page.getByLabel(/Açık adres/).fill("Moda Cad. No 1 Daire 2");
  await page.getByLabel(/Mesafeli Satış Sözleşmesi/).check();
  await page.getByRole("button", { name: "Ödemeye geç" }).click();

  // The fake provider's page stands in for iyzico's hosted form.
  await expect(page).toHaveURL(/\/odeme\/sahte/);
  await page.getByRole("button", { name: "Ödemeyi onayla" }).click();

  await expect(page).toHaveURL(/\/siparis\/onay\//);
  await expect(page.getByRole("heading", { name: "Siparişiniz alındı" })).toBeVisible();
  await expect(page.getByText("Ödemeniz onaylandı")).toBeVisible();
  await expect(page.getByText("Erken Hasat Zeytinyağı · 500 ml cam şişe × 1")).toBeVisible();
});
