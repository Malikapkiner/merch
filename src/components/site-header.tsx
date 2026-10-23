import Link from "next/link";
import { AnnouncementBar } from "@/components/announcement-bar";
import { CartIndicator } from "@/components/cart-indicator";
import { SiteNav } from "@/components/site-nav";
import { siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/catalog";
import { getShipping } from "@/lib/shipping";
import type { Category } from "@/modules/catalog";

/** The header must still render when the database is unreachable. */
async function loadHeaderData(): Promise<{ categories: Category[]; freeShippingThresholdKurus: number | null }> {
  try {
    const [categories, shipping] = await Promise.all([getCatalog().listCategories(), getShipping().getSettings()]);
    return { categories, freeShippingThresholdKurus: shipping.freeShippingThresholdKurus };
  } catch {
    return { categories: [], freeShippingThresholdKurus: null };
  }
}

export async function SiteHeader() {
  const { categories, freeShippingThresholdKurus } = await loadHeaderData();
  const links = [
    { href: "/urunler", label: "Tüm Ürünler" },
    ...categories.map((c) => ({ href: `/urunler?kategori=${c.slug}`, label: c.name })),
  ];
  return (
    <header className="site-header">
      <AnnouncementBar freeShippingThresholdKurus={freeShippingThresholdKurus} />
      <div className="container site-header__inner">
        <Link href="/" className="site-logo">
          {siteConfig.brandName}
        </Link>
        <div className="site-header__actions">
          <Link href="/hesap" className="site-header__account">
            Hesabım
          </Link>
          <CartIndicator />
        </div>
      </div>
      <SiteNav links={links} />
    </header>
  );
}
