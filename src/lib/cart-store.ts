"use client";

import { useSyncExternalStore } from "react";
import type { CartItem } from "@/modules/cart";
import { addToCart, cartItemCount, removeFromCart, setCartQuantity } from "@/modules/cart";

const STORAGE_KEY = "merch:cart:v1";
const EMPTY: CartItem[] = [];

let cached: CartItem[] | null = null;
const listeners = new Set<() => void>();

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<CartItem>;
  return (
    Number.isInteger(item.variantId) &&
    (item.variantId as number) > 0 &&
    Number.isInteger(item.quantity) &&
    (item.quantity as number) > 0
  );
}

function parse(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Reads the persisted cart; localStorage survives reloads and browser restarts. */
function read(): CartItem[] {
  if (typeof window === "undefined") return EMPTY;
  return parse(window.localStorage.getItem(STORAGE_KEY));
}

function getSnapshot(): CartItem[] {
  cached ??= read();
  return cached;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function commit(items: CartItem[]): void {
  cached = items;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage can be unavailable (e.g. private mode); the cart still works for this view.
    }
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current cart items, kept in sync across every component that reads it. */
export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** The number of items in the cart (sum of line quantities). */
export function useCartCount(): number {
  return cartItemCount(useCart());
}

/** Adds a Variant to the cart, persisting it for the next visit. */
export function addVariantToCart(variantId: number, quantity = 1): void {
  commit(addToCart(getSnapshot(), variantId, quantity));
}

export function changeCartQuantity(variantId: number, quantity: number): void {
  commit(setCartQuantity(getSnapshot(), variantId, quantity));
}

export function removeCartVariant(variantId: number): void {
  commit(removeFromCart(getSnapshot(), variantId));
}
