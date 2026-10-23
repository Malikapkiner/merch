"use client";

import { useEffect, useState } from "react";
import { addVariantToCart } from "@/lib/cart-store";

/** Adds one of the given Variant (the card's Varsayılan Varyant) to the cart. */
export function AddToCartButton({ variantId }: { variantId: number }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <button
      className="button button--block"
      type="button"
      onClick={() => {
        addVariantToCart(variantId);
        setAdded(true);
      }}
    >
      {added ? "Sepete eklendi" : "Sepete ekle"}
    </button>
  );
}
