import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { formatPrice, VAT_INCLUDED_LABEL } from "@/lib/format-price";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ kategori?: string }> };

export const metadata: Metadata = {
  title: "Ürünler",
  description: "Doğal zeytinyağı, zeytin ve salça ürünlerimizi keşfedin.",
};

export default async function ProductListPage({ searchParams }: Props) {
  const { kategori } = await searchParams;
  const [categories, products] = await Promise.all([
    getCatalog().listCategories(),
    getCatalog().listProducts({ categorySlug: kategori }),
  ]);

  return (
    <div className="container section">
      <h1 className="heading-section">Ürünler</h1>
      <nav className="filter-bar" aria-label="Kategoriler">
        <Link href="/urunler" aria-current={kategori ? undefined : "page"}>
          Tümü
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/urunler?kategori=${c.slug}`} aria-current={kategori === c.slug ? "page" : undefined}>
            {c.name}
          </Link>
        ))}
      </nav>
      {products.length === 0 ? (
        <p>Bu kategoride ürün bulunamadı.</p>
      ) : (
        <ul className="product-grid">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/urunler/${p.slug}`} className="product-card">
                {p.coverImage ? (
                  <div className="product-photo">
                    <Image src={p.coverImage.url} alt={p.name} fill sizes="(max-width: 48rem) 50vw, 33vw" />
                  </div>
                ) : (
                  <div className="photo-placeholder" role="img" aria-label={p.name} />
                )}
                <h2>{p.name}</h2>
                {p.fromPriceKurus !== null && (
                  <p className="price">
                    {formatPrice(p.fromPriceKurus)}&apos;den başlayan <span className="vat-note">{VAT_INCLUDED_LABEL}</span>
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
