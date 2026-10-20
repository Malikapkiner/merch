import type { Metadata } from "next";
import { AdminStatus } from "@/components/admin-status";
import { resetPasswordAction } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yeni şifre belirle",
  // The reset token is in the URL; keep it out of the Referer sent to other sites.
  robots: { index: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ hata?: string }> };

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const [{ token }, { hata }] = await Promise.all([params, searchParams]);

  return (
    <div className="container section narrow">
      <h1 className="heading-section">Yeni şifre belirle</h1>
      <AdminStatus error={hata} />
      <form action={resetPasswordAction} className="admin-form">
        <input type="hidden" name="token" value={decodeURIComponent(token)} />
        <div className="field">
          <label htmlFor="password">Yeni şifre (en az 8 karakter)</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div className="field">
          <label htmlFor="passwordConfirm">Yeni şifre (tekrar)</label>
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
          Şifreyi güncelle
        </button>
      </form>
    </div>
  );
}
