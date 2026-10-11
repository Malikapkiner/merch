import Link from "next/link";
import { navLinks, siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="site-logo">
          {siteConfig.brandName}
        </Link>
        <nav className="site-nav" aria-label="Ana gezinme">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        {/* Placeholder: wired to the real cart in a later ticket. */}
        <Link href="/sepet" className="cart-indicator" aria-label="Sepet, 0 ürün">
          Sepet (0)
        </Link>
      </div>
    </header>
  );
}
