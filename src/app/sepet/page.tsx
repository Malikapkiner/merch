import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = {
  title: "Sepet",
  description: "Sepetinizdeki ürünler, kargo ücreti ve toplam tutar.",
};

/** Messages for a payment that didn't complete, keyed by the payment callback's `hata` value. */
const PAYMENT_ERRORS: Record<string, string> = {
  "odeme-basarisiz": "Ödeme tamamlanamadı. Sepetiniz duruyor; bilgilerinizi kontrol edip yeniden deneyebilirsiniz.",
  "stok-tukendi":
    "Siz ödeme yaparken sepetinizdeki bir ürün tükendi. Ödemeniz iptal edildi ve kartınızdan çekilmeyecek; lütfen sepetinizi kontrol edin.",
  "odeme-bekliyor":
    "Ödemenizin sonucu henüz kesinleşmedi. Lütfen yeniden ödeme yapmayın; ödeme onaylanınca siparişiniz otomatik olarak işleme alınır.",
};

type Props = { searchParams: Promise<{ hata?: string }> };

export default async function CartPage({ searchParams }: Props) {
  const { hata } = await searchParams;

  return (
    <div className="container section">
      <h1 className="heading-section">Sepet</h1>
      {hata && (
        <p className="form-error" role="alert">
          {PAYMENT_ERRORS[hata] ?? PAYMENT_ERRORS["odeme-basarisiz"]}
        </p>
      )}
      <CartView />
    </div>
  );
}
