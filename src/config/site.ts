/** Single source of truth for the brand name ("Sarolive" is a working name). */
export const siteConfig = {
  brandName: "Sarolive",
  description: "Doğal zeytinyağı, zeytin ve salça. Üreticiden doğrudan sofranıza.",
} as const;

/**
 * Where Havale Siparişleri are paid to. Placeholder values: replace with the
 * Store's real account before go-live (ticket 16).
 */
export const bankAccount = {
  bankName: "Örnek Bank",
  accountHolder: "Merch Gıda Ticaret Ltd. Şti.",
  iban: "TR00 0000 0000 0000 0000 0000 00",
} as const;

/** Legal pages; slugs match the Legal module documents. */
export const legalLinks = [
  { href: "/yasal/mesafeli-satis-sozlesmesi", label: "Mesafeli Satış Sözleşmesi" },
  { href: "/yasal/on-bilgilendirme-formu", label: "Ön Bilgilendirme Formu" },
  { href: "/yasal/iptal-ve-iade-kosullari", label: "İptal ve İade Koşulları" },
  { href: "/yasal/kvkk-aydinlatma-metni", label: "KVKK Aydınlatma Metni" },
  { href: "/yasal/gizlilik-ve-cerez-politikasi", label: "Gizlilik ve Çerez Politikası" },
] as const;
