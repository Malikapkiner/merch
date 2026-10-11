/** Single source of truth for the brand name ("Merch" is a working name). */
export const siteConfig = {
  brandName: "Merch",
  description: "Doğal zeytinyağı, zeytin ve salça. Üreticiden doğrudan sofranıza.",
} as const;

export const navLinks = [{ href: "/urunler", label: "Ürünler" }] as const;

/** Legal pages; slugs match the Legal module documents. */
export const legalLinks = [
  { href: "/yasal/mesafeli-satis-sozlesmesi", label: "Mesafeli Satış Sözleşmesi" },
  { href: "/yasal/on-bilgilendirme-formu", label: "Ön Bilgilendirme Formu" },
  { href: "/yasal/iptal-ve-iade-kosullari", label: "İptal ve İade Koşulları" },
  { href: "/yasal/kvkk-aydinlatma-metni", label: "KVKK Aydınlatma Metni" },
  { href: "/yasal/gizlilik-ve-cerez-politikasi", label: "Gizlilik ve Çerez Politikası" },
] as const;
