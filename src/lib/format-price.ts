const formatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

/** Formats integer kuruş as TRY, e.g. 34950 -> "₺349,50". Prices include KDV. */
export function formatPrice(kurus: number): string {
  return formatter.format(kurus / 100);
}

export const VAT_INCLUDED_LABEL = "KDV dahil";
