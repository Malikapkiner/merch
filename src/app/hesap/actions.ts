"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireMember, MEMBER_SESSION_COOKIE } from "@/lib/member-session";
import { getMembers } from "@/lib/members";
import { siteOrigin } from "@/lib/site-url";
import type { MemberAddressField } from "@/modules/accounts";

function textField(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}hata=${encodeURIComponent(message)}`);
}

/** Where to continue after signing in: the account page, or checkout when the Customer came from there. */
function destination(formData: FormData): string {
  return textField(formData, "devam") === "/odeme" ? "/odeme" : "/hesap";
}

async function startSession(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(MEMBER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function loginAction(formData: FormData): Promise<void> {
  const next = destination(formData);
  const result = await getMembers().login({
    email: textField(formData, "email"),
    password: String(formData.get("password") ?? ""),
  });
  if (!result.ok) {
    const message =
      result.reason === "rate-limited"
        ? "Çok fazla başarısız deneme yaptınız. Lütfen 15 dakika sonra tekrar deneyin."
        : "E-posta veya şifre hatalı.";
    fail(next === "/odeme" ? "/hesap/giris?devam=/odeme" : "/hesap/giris", message);
  }
  await startSession(result.token, result.expiresAt);
  redirect(next);
}

export async function registerAction(formData: FormData): Promise<void> {
  const next = destination(formData);
  const email = textField(formData, "email");
  const password = String(formData.get("password") ?? "");
  const back = "/hesap/kayit";
  if (password !== String(formData.get("passwordConfirm") ?? "")) fail(back, "Şifreler eşleşmiyor.");

  const members = getMembers();
  const registered = await members.register({ email, password });
  if (!registered.ok) {
    fail(
      back,
      {
        "invalid-email": "Geçerli bir e-posta adresi girin.",
        "weak-password": "Şifre en az 8 karakter olmalıdır.",
        "email-taken": "Bu e-posta adresiyle zaten bir hesap var. Giriş yapabilir veya şifrenizi sıfırlayabilirsiniz.",
      }[registered.reason],
    );
  }
  const login = await members.login({ email, password });
  if (!login.ok) redirect("/hesap/giris");
  await startSession(login.token, login.expiresAt);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
  if (token) await getMembers().logout(token);
  cookieStore.delete(MEMBER_SESSION_COOKIE);
  redirect("/");
}

export async function requestPasswordResetAction(formData: FormData): Promise<void> {
  const origin = await siteOrigin();
  await getMembers().requestPasswordReset(textField(formData, "email"), {
    resetUrl: (token) => `${origin}/hesap/sifre-sifirla/${token}`,
  });
  redirect("/hesap/sifremi-unuttum?gonderildi=1");
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const token = textField(formData, "token");
  const back = `/hesap/sifre-sifirla/${encodeURIComponent(token)}`;
  const password = String(formData.get("password") ?? "");
  if (password !== String(formData.get("passwordConfirm") ?? "")) fail(back, "Şifreler eşleşmiyor.");

  const result = await getMembers().resetPassword({ token, password });
  if (!result.ok) {
    if (result.reason === "weak-password") fail(back, "Şifre en az 8 karakter olmalıdır.");
    fail("/hesap/sifremi-unuttum", "Bu bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.");
  }
  redirect("/hesap/giris?sifirlandi=1");
}

const ADDRESS_FIELD_LABELS: Record<MemberAddressField, string> = {
  fullName: "Ad soyad",
  phone: "Telefon",
  province: "İl",
  district: "İlçe",
  neighbourhood: "Mahalle",
  addressLine: "Açık adres",
};

export async function saveAddressAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const idText = textField(formData, "id");
  const addressId = /^\d+$/.test(idText) ? Number(idText) : undefined;
  const back = addressId === undefined ? "/hesap/adresler" : `/hesap/adresler?duzenle=${addressId}`;

  const result = await getMembers().saveAddress(
    member.id,
    {
      fullName: textField(formData, "fullName"),
      phone: textField(formData, "phone"),
      province: textField(formData, "province"),
      district: textField(formData, "district"),
      neighbourhood: textField(formData, "neighbourhood"),
      addressLine: textField(formData, "addressLine"),
    },
    addressId,
  );
  if (!result.ok) {
    if (result.fields.length === 0) fail("/hesap/adresler", "Adres bulunamadı.");
    fail(back, `Lütfen kontrol edin: ${result.fields.map((field) => ADDRESS_FIELD_LABELS[field]).join(", ")}.`);
  }
  redirect("/hesap/adresler?kaydedildi=1");
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const id = Number(textField(formData, "id"));
  if (Number.isInteger(id)) await getMembers().deleteAddress(member.id, id);
  redirect("/hesap/adresler");
}
