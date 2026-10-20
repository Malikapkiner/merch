import Link from "next/link";
import { legalLinks, navLinks, siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <h2>{siteConfig.brandName}</h2>
            <p>{siteConfig.description}</p>
          </div>
          <nav aria-label="Mağaza">
            <h2>Mağaza</h2>
            <ul>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
              <li>
                <Link href="/siparis-sorgula">Sipariş sorgula</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Yasal">
            <h2>Yasal</h2>
            <ul>
              {legalLinks.map((link) => (
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
