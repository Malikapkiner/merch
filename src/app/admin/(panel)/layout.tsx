import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "../actions";

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container section">
      <header className="admin-header">
        <nav className="admin-nav" aria-label="Yönetim">
          <Link href="/admin">Ürünler</Link>
          <Link href="/admin/siparisler">Siparişler</Link>
          <Link href="/admin/kategoriler">Kategoriler</Link>
          <Link href="/admin/kargo">Kargo</Link>
        </nav>
        <form action={logoutAction}>
          <button className="link-button" type="submit">
            Çıkış yap
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
