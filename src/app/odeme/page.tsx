import type { Metadata } from "next";
import { listDistricts, listProvinces } from "@/modules/address";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Ödeme",
  description: "Teslimat ve fatura bilgilerinizi girip siparişinizi tamamlayın.",
  robots: { index: false },
};

/** Messages for a failed payment, keyed by the callback's `hata` value. */
const PAYMENT_ERRORS: Record<string, string> = {
  "odeme-basarisiz": "Ödeme tamamlanamadı. Sepetiniz duruyor; bilgilerinizi kontrol edip yeniden deneyebilirsiniz.",
  "stok-tukendi":
    "Siz ödeme yaparken sepetinizdeki bir ürün tükendi. Ödemeniz iptal edildi ve kartınızdan çekilmeyecek; lütfen sepetinizi kontrol edin.",
};

type Props = { searchParams: Promise<{ hata?: string }> };

export default async function CheckoutPage({ searchParams }: Props) {
  const { hata } = await searchParams;
  const districtsByProvince = Object.fromEntries(listProvinces().map((province) => [province, listDistricts(province)]));

  return (
    <div className="container section">
      <h1 className="heading-section">Ödeme</h1>
      {hata && (
        <p className="form-error" role="alert">
          {PAYMENT_ERRORS[hata] ?? PAYMENT_ERRORS["odeme-basarisiz"]}
        </p>
      )}
      <CheckoutForm districtsByProvince={districtsByProvince} />
    </div>
  );
}
