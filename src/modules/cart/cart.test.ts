import { describe, expect, it } from "vitest";
import type { CartVariant } from "./index";
import { addToCart, cartItemCount, priceCart, removeFromCart, setCartQuantity } from "./index";

const settings = { shippingFeeKurus: 6000, freeShippingThresholdKurus: 100000 };

function variant(overrides: Partial<CartVariant> & { id: number }): CartVariant {
  return {
    name: "500 ml cam şişe",
    productSlug: "erken-hasat-zeytinyagi",
    productName: "Erken Hasat Zeytinyağı",
    priceKurus: 34950,
    vatRatePercent: 1,
    stock: 10,
    ...overrides,
  };
}

describe("Cart items", () => {
  it("adds a Variant with a quantity of one", () => {
    expect(addToCart([], 7)).toEqual([{ variantId: 7, quantity: 1 }]);
  });

  it("merges a Variant that is already in the cart", () => {
    const once = addToCart([], 7, 2);

    expect(addToCart(once, 7, 3)).toEqual([{ variantId: 7, quantity: 5 }]);
  });

  it("ignores a non-positive quantity when adding", () => {
    expect(addToCart([], 7, 0)).toEqual([]);
  });

  it("sets a line quantity and removes the line when set to zero", () => {
    const cart = addToCart(addToCart([], 7, 2), 9, 1);

    expect(setCartQuantity(cart, 7, 4)).toEqual([
      { variantId: 7, quantity: 4 },
      { variantId: 9, quantity: 1 },
    ]);
    expect(setCartQuantity(cart, 7, 0)).toEqual([{ variantId: 9, quantity: 1 }]);
  });

  it("removes a Variant from the cart", () => {
    const cart = addToCart(addToCart([], 7, 2), 9, 1);

    expect(removeFromCart(cart, 7)).toEqual([{ variantId: 9, quantity: 1 }]);
  });

  it("counts the total quantity across lines", () => {
    const cart = addToCart(addToCart([], 7, 2), 9, 3);

    expect(cartItemCount(cart)).toBe(5);
  });
});

describe("Cart pricing", () => {
  it("prices each line from the current Variant price", () => {
    const totals = priceCart(
      [{ variantId: 7, quantity: 2 }],
      [variant({ id: 7, priceKurus: 34950 })],
      settings,
    );

    expect(totals.lines[0]).toMatchObject({ quantity: 2, lineTotalKurus: 69900 });
    expect(totals.subtotalKurus).toBe(69900);
  });

  it("sums line totals in kuruş across Variants", () => {
    const totals = priceCart(
      [
        { variantId: 7, quantity: 2 },
        { variantId: 9, quantity: 1 },
      ],
      [variant({ id: 7, priceKurus: 34950 }), variant({ id: 9, priceKurus: 12900 })],
      settings,
    );

    expect(totals.subtotalKurus).toBe(82800);
    expect(totals.itemCount).toBe(3);
  });

  it("adds the flat shipping fee below the free shipping threshold", () => {
    const totals = priceCart([{ variantId: 7, quantity: 1 }], [variant({ id: 7, priceKurus: 34950 })], settings);

    expect(totals.shippingFeeKurus).toBe(6000);
    expect(totals.totalKurus).toBe(40950);
    expect(totals.remainingForFreeShippingKurus).toBe(65050);
  });

  it("zeroes the shipping fee once the subtotal reaches the threshold", () => {
    const totals = priceCart([{ variantId: 7, quantity: 2 }], [variant({ id: 7, priceKurus: 50000 })], settings);

    expect(totals.subtotalKurus).toBe(100000);
    expect(totals.shippingFeeKurus).toBe(0);
    expect(totals.totalKurus).toBe(100000);
    expect(totals.remainingForFreeShippingKurus).toBe(0);
  });

  it("warns when a line quantity exceeds the current Stok", () => {
    const totals = priceCart([{ variantId: 7, quantity: 3 }], [variant({ id: 7, stock: 2 })], settings);

    expect(totals.lines[0].exceedsStock).toBe(true);
    expect(totals.exceedsStock).toBe(true);
  });

  it("does not warn when the quantity is within Stok", () => {
    const totals = priceCart([{ variantId: 7, quantity: 2 }], [variant({ id: 7, stock: 2 })], settings);

    expect(totals.lines[0].exceedsStock).toBe(false);
    expect(totals.exceedsStock).toBe(false);
  });

  it("drops a Variant that is no longer available", () => {
    const totals = priceCart([{ variantId: 999, quantity: 1 }], [], settings);

    expect(totals.lines).toEqual([]);
    expect(totals.subtotalKurus).toBe(0);
  });

  it("charges no shipping on an empty cart", () => {
    const totals = priceCart([], [], settings);

    expect(totals.shippingFeeKurus).toBe(0);
    expect(totals.totalKurus).toBe(0);
    expect(totals.remainingForFreeShippingKurus).toBe(0);
  });
});
