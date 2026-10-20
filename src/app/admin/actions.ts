"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAccounts } from "@/lib/accounts";
import { ADMIN_SESSION_COOKIE, requireAdmin } from "@/lib/admin-session";
import { getCatalog } from "@/lib/catalog";
import { getOrders } from "@/lib/orders";
import { isOrderStatus } from "@/lib/order-status";
import { getShipping } from "@/lib/shipping";
import { MAX_PRODUCT_IMAGE_BYTES, ProductImageError } from "@/modules/catalog";
import { MissingTrackingNumberError, OrderStatusError } from "@/modules/orders";
import { mediaStorage } from "@/lib/media";
import { parsePriceInput } from "@/lib/price-input";

const MAX_IMAGE_LABEL = `${MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)} MB`;

function imageUploadFailure(error: unknown): string {
  if (error instanceof ProductImageError) {
    if (error.reason === "unsupported-image-type") {
      return "Desteklenmeyen dosya türü. Yalnızca JPEG, PNG ve WebP görsel yükleyin.";
    }
    if (error.reason === "image-too-large") {
      return `Görsel dosyası ${MAX_IMAGE_LABEL} sınırını aşıyor.`;
    }
  }
  return "Görseller yüklenemedi.";
}

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

export async function updateShippingSettingsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const back = "/admin/kargo";
  const shippingFeeKurus = parsePriceInput(textField(formData, "shippingFee"));
  const freeShippingThresholdKurus = parsePriceInput(textField(formData, "threshold"));
  if (shippingFeeKurus === null || freeShippingThresholdKurus === null) fail(back, "Kargo bilgileri geçersiz.");

  await getShipping().setSettings({ shippingFeeKurus, freeShippingThresholdKurus });
  redirect(`${back}?durum=kaydedildi`);
}

export async function uploadProductImagesAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const productId = nonNegativeInt(formData, "productId");
  if (productId === null) fail("/admin", "Ürün bulunamadı.");
  const back = `/admin/urunler/${productId}`;

  const files = formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length === 0) fail(back, "Yüklenecek görsel seçilmedi.");
  const storage = mediaStorage();
  if (!storage) fail(back, "Görsel depolama yapılandırılmadı.");

  const buffers = await Promise.all(files.map((file) => file.arrayBuffer()));
  try {
    await getCatalog().addProductImages(productId, buffers.map((buffer) => new Uint8Array(buffer)));
  } catch (error) {
    fail(back, imageUploadFailure(error));
  }
  revalidatePath("/urunler");
  redirect(`${back}?durum=kaydedildi`);
}

export async function moveProductImageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const productId = nonNegativeInt(formData, "productId");
  const imageId = nonNegativeInt(formData, "imageId");
  if (productId === null || imageId === null) fail("/admin", "Görsel bulunamadı.");
  const back = `/admin/urunler/${productId}`;
  const direction = textField(formData, "direction") === "down" ? "down" : "up";

  try {
    await getCatalog().moveProductImage(imageId, direction);
  } catch {
    fail(back, "Görsel taşınamadı.");
  }
  revalidatePath("/urunler");
  redirect(`${back}?durum=kaydedildi`);
}

export async function deleteProductImageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const productId = nonNegativeInt(formData, "productId");
  const imageId = nonNegativeInt(formData, "imageId");
  if (productId === null || imageId === null) fail("/admin", "Görsel bulunamadı.");
  const back = `/admin/urunler/${productId}`;

  try {
    await getCatalog().deleteProductImage(imageId);
  } catch {
    fail(back, "Görsel silinemedi.");
  }
  revalidatePath("/urunler");
  redirect(`${back}?durum=kaydedildi`);
}

export async function changeOrderStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const orderNumber = textField(formData, "orderNumber");
  const status = textField(formData, "status");
  const back = `/admin/siparisler/${encodeURIComponent(orderNumber)}`;
  if (!isOrderStatus(status)) fail(back, "Geçersiz sipariş durumu.");

  try {
    await getOrders().changeStatus(orderNumber, status, {
      trackingNumber: textField(formData, "trackingNumber"),
      note: textField(formData, "note"),
    });
  } catch (error) {
    if (error instanceof MissingTrackingNumberError) fail(back, "Kargoya vermek için takip numarası zorunludur.");
    if (error instanceof OrderStatusError) fail(back, "Bu durum geçişi yapılamaz.");
    throw error;
  }
  redirect(`${back}?durum=kaydedildi`);
}
