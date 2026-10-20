"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { priceCart, type CartItem, type CartTotals, type CartVariant } from "@/modules/cart";
import type { ShippingSettings } from "@/modules/shipping";

type CartData = { key: string; variants: CartVariant[]; settings: ShippingSettings };

export type PricedCart =
  | { state: "empty"; items: CartItem[] }
  | { state: "loading"; items: CartItem[] }
  | { state: "failed"; items: CartItem[] }
  /** `unavailable` counts cart items whose Variant is no longer on sale. */
  | { state: "ready"; items: CartItem[]; totals: CartTotals; unavailable: number };

/** The browser cart priced against current Variants and shipping settings from `/api/cart`. */
export function usePricedCart(): PricedCart {
  const items = useCart();
  const idsKey = items.map((item) => item.variantId).join(",");
  const [data, setData] = useState<CartData | null>(null);
  const [failed, setFailed] = useState(false);

  // Refetches only when the set of Variants changes; quantities are repriced locally.
  useEffect(() => {
    if (idsKey === "") return;
    let active = true;
    fetch(`/api/cart?variantIds=${idsKey}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("cart fetch failed"))))
      .then((payload: { variants: CartVariant[]; settings: ShippingSettings }) => {
        if (active) {
          setData({ key: idsKey, ...payload });
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [idsKey]);

  if (items.length === 0) return { state: "empty", items };
  if (failed) return { state: "failed", items };
  // A stale response for a previous cart is ignored until the current one arrives.
  if (!data || data.key !== idsKey) return { state: "loading", items };
  const totals = priceCart(items, data.variants, data.settings);
  return { state: "ready", items, totals, unavailable: items.length - totals.lines.length };
}
