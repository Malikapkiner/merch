import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/catalog";
import { formatPrice } from "@/lib/format-price";
import { getShipping } from "@/lib/shipping";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.brandName} | Doğal zeytinyağı, zeytin ve salça` },
  description: siteConfig.description,
};

const FEATURED_COUNT = 8;

export default async function HomePage() {
  const [categories, featured, shipping] = await Promise.all([
    getCatalog().listCategories(),
    getCatalog().listProducts({ newestFirst: true, limit: FEATURED_COUNT }),
    getShipping().getSettings(),
  ]);
  const trust = [
    { title: "Üreticiden", text: "Aracısız, doğrudan üreticiden sofranıza." },
    { title: "Güvenli ödeme", text: "Kart bilgileriniz iyzico güvencesiyle işlenir." },
    {
      title: "Ücretsiz kargo",
      text: `${formatPrice(shipping.freeShippingThresholdKurus)} ve üzeri siparişlerde kargo bizden.`,
    },
  ];

  return (
    <>
      <section className="hero-slim">
        <div className="container hero-slim__inner">
          <p className="eyebrow">Doğal ürünler</p>
          <h1 className="heading-hero">{siteConfig.brandName}</h1>
          <p className="lead">{siteConfig.description}</p>
          <Link href="/urunler" className="button">
            Ürünleri keşfet
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="section section--tight">
          <div className="container">
            <h2 className="heading-section">Kategoriler</h2>
            <ul className="category-tiles">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/urunler?kategori=${c.slug}`} className="category-tile">
                    <span>{c.name}</span>
                    <span className="category-tile__cta">Ürünleri incele</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="section section--tight">
          <div className="container">
            <div className="section-head">
              <h2 className="heading-section">Öne Çıkan Ürünler</h2>
              <Link href="/urunler" className="section-head__link">
                Tümünü gör
              </Link>
            </div>
            <ul className="product-grid">
              {featured.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="trust-strip" aria-label="Güvence">
        <div className="container trust-strip__grid">
          {trust.map((item) => (
            <div key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container story">
          <div className="photo-placeholder story__photo" role="img" aria-label="Üretici fotoğrafı" />
          <div className="story__text">
            <p className="eyebrow">Hikâyemiz</p>
            <h2 className="heading-section">Ağaçtan sofraya, aracısız</h2>
            <p>
              Tek bir üreticinin ağaçlarından, küçük partiler halinde hasat edilen zeytinyağı, zeytin ve salça.
              Katkısız, işlenmemiş, doğadan geldiği gibi; özenle paketlenip kapınıza kadar güvenle ulaştırılır.
            </p>
            <Link href="/urunler" className="button">
              Alışverişe başla
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
