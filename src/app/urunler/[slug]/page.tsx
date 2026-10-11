import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { VariantPicker } from "./variant-picker";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getCatalog().getProduct((await params).slug);
  if (!product) return {};
  return { title: product.name, description: product.description || undefined };
}

export default async function ProductDetailPage({ params }: Props) {
  const product = await getCatalog().getProduct((await params).slug);
  if (!product) notFound();

  const prices = product.variants.map((v) => v.priceKurus / 100);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    offers: prices.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "TRY",
          lowPrice: Math.min(...prices),
          highPrice: Math.max(...prices),
          offerCount: prices.length,
          availability: product.variants.some((v) => !v.soldOut)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        }
      : undefined,
  };

  return (
    <div className="container section product-detail">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="photo-placeholder" role="img" aria-label={product.name} />
      <div className="product-detail__info">
        {product.category && <p className="eyebrow">{product.category.name}</p>}
        <h1 className="heading-section">{product.name}</h1>
        <p className="lead">{product.description}</p>
        <VariantPicker
          variants={product.variants.map(({ id, name, priceKurus, soldOut }) => ({ id, name, priceKurus, soldOut }))}
        />
      </div>
    </div>
  );
}
