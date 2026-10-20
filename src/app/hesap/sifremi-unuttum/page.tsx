import type { Metadata } from "next";
import { AdminStatus } from "@/components/admin-status";
import { requestPasswordResetAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Şifremi unuttum", robots: { index: false } };

type Props = { searchParams: Promise<{ hata?: string; gonderildi?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { hata, gonderildi } = await searchParams;

  return (
    <div className="container section narrow">
      <h1 className="heading-section">Şifremi unuttum</h1>
      <AdminStatus error={hata} />
      {gonderildi ? (
        <p className="form-success" role="status">
          Bu e-posta adresiyle kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderdik. Bağlantı 1 saat geçerlidir.
        </p>
      ) : (
        <>
          <p className="lead">E-posta adresinizi girin, size şifrenizi sıfırlamanız için bir bağlantı gönderelim.</p>
          <form action={requestPasswordResetAction} className="admin-form">
            <div className="field">
              <label htmlFor="email">E-posta</label>
              <input id="email" name="email" type="email" required autoComplete="username" />
            </div>
            <button className="button" type="submit">
              Bağlantı gönder
            </button>
          </form>
        </>
      )}
    </div>
  );
}
