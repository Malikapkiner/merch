import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminStatus } from "@/components/admin-status";
import { getMember } from "@/lib/member-session";
import { registerAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Üye ol", robots: { index: false } };

type Props = { searchParams: Promise<{ hata?: string }> };

export default async function MemberRegisterPage({ searchParams }: Props) {
  const { hata } = await searchParams;
  if (await getMember()) redirect("/hesap");

  return (
    <div className="container section narrow">
      <h1 className="heading-section">Üye ol</h1>
      <p className="lead">Adreslerinizi kaydedin, siparişlerinizi takip edin ve daha hızlı ödeme yapın.</p>
      <AdminStatus error={hata} />
      <form action={registerAction} className="admin-form">
        <div className="field">
          <label htmlFor="email">E-posta</label>
          <input id="email" name="email" type="email" required autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="password">Şifre (en az 8 karakter)</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div className="field">
          <label htmlFor="passwordConfirm">Şifre (tekrar)</label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <button className="button" type="submit">
          Üye ol
        </button>
      </form>
      <p>
        Zaten üye misiniz?{" "}
        <Link className="link-button" href="/hesap/giris">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
