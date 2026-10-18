import type { VariantWithProduct } from "../catalog";
import type { ShippingSettings } from "../shipping";
import { NO_SHIPPING_CHARGE, shippingChargeFor } from "../shipping";

/** A line the customer holds in their (browser-local) cart. */
export type CartItem = { variantId: number; quantity: number };

/** A Variant as resolved for the cart, with its Product context and current price/Stok. */
export type CartVariant = VariantWithProduct;

export type CartLine = CartVariant & {
  quantity: number;
  /** priceKurus * quantity, in kuruş. */
  lineTotalKurus: number;
  /** True when this line's quantity exceeds the Variant's current Stok. */
  exceedsStock: boolean;
};

export type CartTotals = {
  lines: CartLine[];
  /** Sum of all line quantities. */
  itemCount: number;
  subtotalKurus: number;
  shippingFeeKurus: number;
  totalKurus: number;
  /** Amount still needed for free shipping; 0 once reached and on an empty cart. */
  remainingForFreeShippingKurus: number;
  /** True when any line's quantity exceeds current Stok. */
  exceedsStock: boolean;
};

/** Adds a Variant, merging into the existing line; a non-positive quantity is ignored. */
export function addToCart(items: CartItem[], variantId: number, quantity = 1): CartItem[] {
  if (quantity < 1) return items;
  const existing = items.find((item) => item.variantId === variantId);
  if (!existing) return [...items, { variantId, quantity }];
  return items.map((item) =>
    item.variantId === variantId ? { ...item, quantity: item.quantity + quantity } : item,
  );
}

/** Sets a line's quantity; a quantity below one removes the line. */
export function setCartQuantity(items: CartItem[], variantId: number, quantity: number): CartItem[] {
  if (quantity < 1) return removeFromCart(items, variantId);
  return items.map((item) => (item.variantId === variantId ? { ...item, quantity } : item));
}

/** Removes a Variant from the cart. */
export function removeFromCart(items: CartItem[], variantId: number): CartItem[] {
  return items.filter((item) => item.variantId !== variantId);
}

/** Total quantity across all lines. */
export function cartItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

/**
 * Prices a cart against the customer's current Variants and the shipping
 * settings. Items whose Variant is gone are dropped; money stays in integer
 * kuruş, and a quantity over Stok is flagged instead of silently changed.
 */
export function priceCart(
  items: CartItem[],
  variants: CartVariant[],
  settings: ShippingSettings,
): CartTotals {
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const lines: CartLine[] = [];
  for (const item of items) {
    const variant = byId.get(item.variantId);
    if (!variant || item.quantity < 1) continue;
    lines.push({
      ...variant,
      quantity: item.quantity,
      lineTotalKurus: variant.priceKurus * item.quantity,
      exceedsStock: item.quantity > variant.stock,
    });
  }

  const subtotalKurus = lines.reduce((sum, line) => sum + line.lineTotalKurus, 0);
  const charge = lines.length ? shippingChargeFor(subtotalKurus, settings) : NO_SHIPPING_CHARGE;

  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalKurus,
    shippingFeeKurus: charge.shippingFeeKurus,
    totalKurus: subtotalKurus + charge.shippingFeeKurus,
    remainingForFreeShippingKurus: charge.remainingForFreeShippingKurus,
    exceedsStock: lines.some((line) => line.exceedsStock),
  };
}
