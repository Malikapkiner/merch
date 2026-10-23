import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getCatalog } from "@/lib/catalog";

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
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
