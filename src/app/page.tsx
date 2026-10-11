import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.brandName} | Doğal zeytinyağı, zeytin ve salça` },
  description: siteConfig.description,
};

const values = [
  { title: "Doğal", text: "Katkısız, işlenmemiş, doğadan geldiği gibi." },
  { title: "Üreticiden", text: "Aracısız, doğrudan üreticiden sofranıza." },
  { title: "Özenle", text: "Küçük partiler, titiz ambalaj, güvenli teslimat." },
];

export default function HomePage() {
  return (
    <>
      <section className="section">
        <div className="container hero">
          <div className="hero__text">
            <p className="eyebrow">Doğal ürünler</p>
            <h1 className="heading-hero">{siteConfig.brandName}</h1>
            <p className="lead">{siteConfig.description}</p>
            <Link href="/urunler" className="button">
              Ürünleri keşfet
            </Link>
          </div>
          <div className="photo-placeholder" role="img" aria-label="Ürün fotoğrafı" />
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="heading-section">Neden {siteConfig.brandName}?</h2>
          <div className="values">
            {values.map((value) => (
              <div key={value.title}>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
