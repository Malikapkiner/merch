import Link from "next/link";
import { CartIndicator } from "@/components/cart-indicator";
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
        <CartIndicator />
      </div>
    </header>
  );
}
