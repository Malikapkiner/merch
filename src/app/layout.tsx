import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/config/site";
import "./globals.css";

/** Header and footer read Categories and shipping settings from the database. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: `${siteConfig.brandName} | Doğal ürünler`, template: `%s | ${siteConfig.brandName}` },
  description: siteConfig.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
