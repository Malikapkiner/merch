import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminStatus } from "@/components/admin-status";
import { getMember } from "@/lib/member-session";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Giriş yap", robots: { index: false } };

type Props = { searchParams: Promise<{ hata?: string; devam?: string; sifirlandi?: string }> };

export default async function MemberLoginPage({ searchParams }: Props) {
  const { hata, devam, sifirlandi } = await searchParams;
  const next = devam === "/odeme" ? "/odeme" : "/hesap";
  if (await getMember()) redirect(next);

  return (
    <div className="container section narrow">
      <h1 className="heading-section">Giriş yap</h1>
      {sifirlandi && (
        <p className="form-success" role="status">
          Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
        </p>
      )}
      <AdminStatus error={hata} />
      <form action={loginAction} className="admin-form">
        <input type="hidden" name="devam" value={next} />
        <div className="field">
          <label htmlFor="email">E-posta</label>
          <input id="email" name="email" type="email" required autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="password">Şifre</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button className="button" type="submit">
          Giriş yap
        </button>
      </form>
      <p>
        <Link className="link-button" href="/hesap/sifremi-unuttum">
          Şifremi unuttum
        </Link>
      </p>
      <p>
        Hesabınız yok mu?{" "}
        <Link className="link-button" href="/hesap/kayit">
          Üye olun
        </Link>
      </p>
    </div>
  );
}
