import Link from "next/link";
import { legalLinks, siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/catalog";
import type { Category } from "@/modules/catalog";

async function loadCategories(): Promise<Category[]> {
  try {
    return await getCatalog().listCategories();
  } catch {
    return [];
  }
}

export async function SiteFooter() {
  const categories = await loadCategories();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <nav aria-label="Alışveriş">
            <h2>Alışveriş</h2>
            <ul>
              <li>
                <Link href="/urunler">Tüm Ürünler</Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/urunler?kategori=${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Müşteri hizmetleri">
            <h2>Müşteri Hizmetleri</h2>
            <ul>
              <li>
                <Link href="/hesap">Hesabım</Link>
              </li>
              <li>
                <Link href="/siparis-sorgula">Sipariş sorgula</Link>
              </li>
              <li>
                <Link href="/yasal/iptal-ve-iade-kosullari">İptal ve İade Koşulları</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Kurumsal">
            <h2>Kurumsal</h2>
            <ul>
              {legalLinks
                .filter((link) => !link.href.endsWith("iptal-ve-iade-kosullari"))
                .map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>
        <p className="site-footer__copy">
          © {new Date().getFullYear()} {siteConfig.brandName}. Tüm hakları saklıdır.{" "}
          <Link href="/admin">Yönetim</Link>
        </p>
      </div>
    </footer>
  );
}
