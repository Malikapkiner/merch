import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { formatPrice, VAT_INCLUDED_LABEL } from "@/lib/format-price";
import type { Product } from "@/modules/catalog";

/** Listing card: links to the Product, shows the Varsayılan Varyant's price and adds it to the cart. */
export function ProductCard({ product }: { product: Product }) {
  const { defaultVariant, fromPriceKurus } = product;
  const hasVariants = fromPriceKurus !== null;
  return (
    <article className="product-card">
      <Link href={`/urunler/${product.slug}`} className="product-card__link">
        {product.coverImage ? (
          <div className="product-photo">
            <Image src={product.coverImage.url} alt={product.name} fill sizes="(max-width: 48rem) 50vw, 25vw" />
          </div>
        ) : (
          <div className="photo-placeholder" role="img" aria-label={product.name} />
        )}
        {product.category && <span className="eyebrow">{product.category.name}</span>}
        <h2>{product.name}</h2>
        {defaultVariant ? (
          <p className="price">
            {formatPrice(defaultVariant.priceKurus)} <span className="vat-note">{VAT_INCLUDED_LABEL}</span>
            <span className="product-card__variant">{defaultVariant.name}</span>
          </p>
        ) : (
          hasVariants && <p className="price price--sold-out">{formatPrice(fromPriceKurus)}</p>
        )}
      </Link>
      {defaultVariant ? (
        <AddToCartButton variantId={defaultVariant.id} />
      ) : (
        hasVariants && <p className="sold-out product-card__sold-out">Tükendi</p>
      )}
    </article>
  );
}
