import type { Metadata } from "next";
import { listDistricts, listProvinces } from "@/modules/address";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Ödeme",
  description: "Teslimat ve fatura bilgilerinizi girip siparişinizi tamamlayın.",
  robots: { index: false },
};

export default function CheckoutPage() {
  const districtsByProvince = Object.fromEntries(listProvinces().map((province) => [province, listDistricts(province)]));

  return (
    <div className="container section">
      <h1 className="heading-section">Ödeme</h1>
      <CheckoutForm districtsByProvince={districtsByProvince} />
    </div>
  );
}
