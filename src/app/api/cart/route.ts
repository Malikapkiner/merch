import type { NextRequest } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { getShipping } from "@/lib/shipping";

export const dynamic = "force-dynamic";

/** Upper bound on how many Variants a single cart request may resolve. */
const MAX_CART_VARIANTS = 100;

/** Parses "1,2,3" into unique positive integer Variant ids, capped to a sane size. */
function variantIds(request: NextRequest): number[] {
  const raw = request.nextUrl.searchParams.get("variantIds") ?? "";
  const ids = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
  return [...new Set(ids)].slice(0, MAX_CART_VARIANTS);
}

/**
 * Resolves a browser-held cart for pricing: the current Variants (price, Stok,
 * Product context) plus the current shipping settings. The client prices the
 * cart with the Cart module so quantity changes render instantly.
 */
export async function GET(request: NextRequest) {
  const ids = variantIds(request);
  const [variants, settings] = await Promise.all([
    getCatalog().getVariantsByIds(ids),
    getShipping().getSettings(),
  ]);
  return Response.json({ variants, settings });
}
