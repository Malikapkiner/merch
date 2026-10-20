import type { Metadata } from "next";
import Link from "next/link";
import { getMember } from "@/lib/member-session";
import { getMembers } from "@/lib/members";
import { listDistricts, listProvinces } from "@/modules/address";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Ödeme",
  description: "Teslimat ve fatura bilgilerinizi girip siparişinizi tamamlayın.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const districtsByProvince = Object.fromEntries(listProvinces().map((province) => [province, listDistricts(province)]));

  const member = await getMember();
  const addresses = member ? await getMembers().listAddresses(member.id) : [];

  return (
    <div className="container section">
      <h1 className="heading-section">Ödeme</h1>
      {!member && (
        <p>
          Üye misiniz?{" "}
          <Link className="link-button" href="/hesap/giris?devam=/odeme">
            Giriş yapın
          </Link>{" "}
          veya üyelik oluşturmadan devam edin.
        </p>
      )}
      <CheckoutForm
        districtsByProvince={districtsByProvince}
        member={member ? { email: member.email, addresses } : null}
      />
    </div>
  );
}
