"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAccounts } from "@/lib/accounts";
import { ADMIN_SESSION_COOKIE, requireAdmin } from "@/lib/admin-session";
import { getCatalog } from "@/lib/catalog";
import { parsePriceInput } from "@/lib/price-input";

export type LoginState = { error?: string } | undefined;

function fail(path: string, message: string): never {
  redirect(`${path}?hata=${encodeURIComponent(message)}`);
}

function textField(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function optionalId(formData: FormData, name: string): number | undefined {
  const value = textField(formData, name);
  return value === "" ? undefined : Number(value);
}

function nonNegativeInt(formData: FormData, name: string): number | null {
  const value = textField(formData, name);
  return /^\d+$/.test(value) ? Number(value) : null;
}

type VariantInput = { name: string; priceKurus: number; vatRatePercent: number; stock: number };

function variantInput(formData: FormData): VariantInput | null {
  const name = textField(formData, "name");
  const priceKurus = parsePriceInput(textField(formData, "price"));
  const vatRatePercent = nonNegativeInt(formData, "vatRatePercent");
  const stock = nonNegativeInt(formData, "stock");
  if (!name || priceKurus === null || vatRatePercent === null || stock === null) return null;
  return { name, priceKurus, vatRatePercent, stock };
}

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const result = await getAccounts().login({
    email: textField(formData, "email"),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) {
    return {
      error:
        result.reason === "rate-limited"
          ? "Çok fazla başarısız deneme yaptınız. Lütfen 15 dakika sonra tekrar deneyin."
          : "E-posta veya şifre hatalı.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: result.expiresAt,
  });
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) await getAccounts().logout(token);
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/giris");
}

export async function createProductAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const back = "/admin/urunler/yeni";
  const slug = textField(formData, "slug");
  const name = textField(formData, "name");
  if (!slug || !name) fail(back, "Kısa ad ve ürün adı zorunludur.");

  const product = await getCatalog().createProduct({
    slug,
    name,
    description: textField(formData, "description"),
    categoryId: optionalId(formData, "categoryId"),
  });
  revalidatePath("/urunler");
  redirect(`/admin/urunler/${product.id}?durum=kaydedildi`);
}

export async function updateProductAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const productId = nonNegativeInt(formData, "productId");
  if (productId === null) fail("/admin", "Ürün bulunamadı.");
  const back = `/admin/urunler/${productId}`;
  const slug = textField(formData, "slug");
  const name = textField(formData, "name");
  if (!slug || !name) fail(back, "Kısa ad ve ürün adı zorunludur.");

  await getCatalog().updateProduct(productId, {
    slug,
    name,
    description: textField(formData, "description"),
    categoryId: optionalId(formData, "categoryId") ?? null,
    published: formData.get("published") !== null,
  });
  revalidatePath("/urunler");
  redirect(`${back}?durum=kaydedildi`);
}

export async function setProductPublishedAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const productId = nonNegativeInt(formData, "productId");
  if (productId === null) fail("/admin", "Ürün bulunamadı.");

  await getCatalog().updateProduct(productId, { published: textField(formData, "published") === "true" });
  revalidatePath("/urunler");
  redirect("/admin?durum=kaydedildi");
}

export async function addVariantAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const productId = nonNegativeInt(formData, "productId");
  if (productId === null) fail("/admin", "Ürün bulunamadı.");
  const back = `/admin/urunler/${productId}`;

  const input = variantInput(formData);
  if (!input) fail(back, "Varyant bilgileri geçersiz.");

  await getCatalog().addVariant(productId, input);
  revalidatePath("/urunler");
  redirect(`${back}?durum=kaydedildi`);
}

export async function updateVariantAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const productId = nonNegativeInt(formData, "productId");
  const variantId = nonNegativeInt(formData, "variantId");
  if (productId === null || variantId === null) fail("/admin", "Varyant bulunamadı.");
  const back = `/admin/urunler/${productId}`;

  const input = variantInput(formData);
  if (!input) fail(back, "Varyant bilgileri geçersiz.");

  await getCatalog().updateVariant(variantId, input);
  revalidatePath("/urunler");
  redirect(`${back}?durum=kaydedildi`);
}

export async function setStockAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const productId = nonNegativeInt(formData, "productId");
  const variantId = nonNegativeInt(formData, "variantId");
  const stock = nonNegativeInt(formData, "stock");
  if (productId === null || variantId === null) fail("/admin", "Varyant bulunamadı.");
  const back = `/admin/urunler/${productId}`;
  if (stock === null) fail(back, "Stok geçersiz.");

  await getCatalog().setStock(variantId, stock);
  revalidatePath("/urunler");
  redirect(`${back}?durum=kaydedildi`);
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const back = "/admin/kategoriler";
  const slug = textField(formData, "slug");
  const name = textField(formData, "name");
  if (!slug || !name) fail(back, "Kısa ad ve kategori adı zorunludur.");

  await getCatalog().createCategory({ slug, name });
  revalidatePath("/urunler");
  redirect(`${back}?durum=kaydedildi`);
}
