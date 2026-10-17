import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Yönetim girişi" };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");

  return (
    <div className="container section narrow">
      <h1 className="heading-section">Yönetim girişi</h1>
      <p className="lead">Mağazayı yönetmek için e-posta ve şifrenizle giriş yapın.</p>
      <LoginForm />
    </div>
  );
}
