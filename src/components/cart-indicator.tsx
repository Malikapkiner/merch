"use client";

import Link from "next/link";
import { useCartCount } from "@/lib/cart-store";

/** Header link to the cart, showing the live item count from the stored cart. */
export function CartIndicator() {
  const count = useCartCount();
  return (
    <Link href="/sepet" className="cart-indicator" aria-label={`Sepet, ${count} ürün`}>
      Sepet ({count})
    </Link>
  );
}
