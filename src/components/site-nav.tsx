"use client";

import Link from "next/link";
import { useState } from "react";

/** Category row: always visible on wide screens, a toggled panel on phones. */
export function SiteNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="site-header__categories" data-open={open || undefined}>
      <div className="container">
        <button
          className="site-menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Kapat" : "Menü"}
        </button>
        <nav id="site-nav" className="site-nav" aria-label="Ana gezinme">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
