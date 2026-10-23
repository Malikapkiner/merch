import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/member-session";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Üye ol", robots: { index: false } };

export default async function MemberRegisterPage() {
  if (await getMember()) redirect("/hesap");

  return (
    <div className="container section narrow">
      <h1 className="heading-section">Üye ol</h1>
      <p className="lead">Adreslerinizi kaydedin, siparişlerinizi takip edin ve daha hızlı ödeme yapın.</p>
      <RegisterForm />
      <p>
        Zaten üye misiniz?{" "}
        <Link className="link-button" href="/hesap/giris">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
