import { expect, test } from "@playwright/test";

test("a failed Üye ol attempt keeps the e-posta and explains the problem next to the field", async ({ page }) => {
  await page.goto("/hesap/kayit");
  const email = page.getByLabel("E-posta");

  await email.fill("ayse@example.com");
  await page.getByLabel("Şifre (en az 8 karakter)").fill("kisa");
  await page.getByRole("button", { name: "Şifreyi göster" }).first().click();
  await expect(page.getByLabel("Şifre (en az 8 karakter)")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Şifreyi gizle" }).click();
  await expect(page.getByLabel("Şifre (en az 8 karakter)")).toHaveAttribute("type", "password");
  await page.getByLabel("Şifre (tekrar)").fill("kisa");
  await page.getByRole("button", { name: "Üye ol" }).click();
  await expect(page.getByText("Şifre en az 8 karakter olmalıdır.")).toBeVisible();
  await expect(email).toHaveValue("ayse@example.com");

  await page.getByLabel("Şifre (en az 8 karakter)").fill("uzunsifre1");
  await page.getByLabel("Şifre (tekrar)").fill("baskasifre1");
  await page.getByRole("button", { name: "Üye ol" }).click();
  await expect(page.getByText("Şifreler eşleşmiyor.")).toBeVisible();
  await expect(email).toHaveValue("ayse@example.com");

  await email.fill("ayse");
  await page.getByLabel("Şifre (en az 8 karakter)").fill("uzunsifre1");
  await page.getByLabel("Şifre (tekrar)").fill("uzunsifre1");
  await page.getByRole("button", { name: "Üye ol" }).click();
  await expect(page.getByText("Geçerli bir e-posta adresi girin")).toBeVisible();
  await expect(email).toHaveValue("ayse");

  await expect(page.getByLabel("Şifre (en az 8 karakter)")).toHaveValue("uzunsifre1");
  await email.fill("ayse@example.com");
  await page.getByRole("button", { name: "Üye ol" }).click();
  await expect(page).toHaveURL(/\/hesap$/);
});
