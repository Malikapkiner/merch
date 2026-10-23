export type DefaultVariant = {
  id: number;
  name: string;
  /** Price in kuruş, KDV included. */
  priceKurus: number;
};

type VariantCandidate = DefaultVariant & { stock: number; position: number };

/**
 * The Varsayılan Varyant of a Product: the cheapest Variant that is in stock,
 * earliest `position` (then id) on equal prices. Null when nothing is in stock.
 */
export function pickDefaultVariant(candidates: VariantCandidate[]): DefaultVariant | null {
  const inStock = candidates
    .filter((v) => v.stock > 0)
    .sort((a, b) => a.priceKurus - b.priceKurus || a.position - b.position || a.id - b.id);
  const [first] = inStock;
  return first ? { id: first.id, name: first.name, priceKurus: first.priceKurus } : null;
}
