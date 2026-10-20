"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearCart } from "@/lib/cart-store";

/**
 * Empties the browser cart when the Customer arrives from a just-confirmed
 * payment, then drops the marker so reopening the link later leaves the cart alone.
 */
export function ClearCart() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    clearCart();
    router.replace(pathname);
  }, [router, pathname]);
  return null;
}
