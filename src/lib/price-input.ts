/**
 * Conversion between the integer kuruş stored in the database and the TRY text an Admin
 * types into a form. Kept together so the two directions can't drift apart.
 */

/** Parses a user-entered TRY amount ("349,50" or "349.50") into integer kuruş, or null. */
export function parsePriceInput(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Formats integer kuruş for an editable input, e.g. 34950 -> "349.50". */
export function formatPriceInput(kurus: number): string {
  return (kurus / 100).toFixed(2);
}
