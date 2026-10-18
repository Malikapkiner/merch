import type { Metadata } from "next";
import { AdminStatus } from "@/components/admin-status";
import { requireAdmin } from "@/lib/admin-session";
import { formatPriceInput } from "@/lib/price-input";
import { getShipping } from "@/lib/shipping";
import { updateShippingSettingsAction } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kargo" };

type Props = { searchParams: Promise<{ hata?: string; durum?: string }> };

export default async function AdminShippingPage({ searchParams }: Props) {
  await requireAdmin();
  const [settings, { hata: error, durum: saved }] = await Promise.all([getShipping().getSettings(), searchParams]);

  return (
    <div className="narrow">
      <h1 className="heading-section">Kargo</h1>
      <AdminStatus error={error} saved={saved} />

      <section className="admin-card">
        <h2>Kargo ücreti ve ücretsiz kargo</h2>
        <form action={updateShippingSettingsAction} className="admin-form">
          <div className="field">
            <label htmlFor="shippingFee">Kargo ücreti (₺, KDV dahil)</label>
            <input
              id="shippingFee"
              name="shippingFee"
              inputMode="decimal"
              defaultValue={formatPriceInput(settings.shippingFeeKurus)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="threshold">Ücretsiz kargo eşiği (₺, KDV dahil)</label>
            <input
              id="threshold"
              name="threshold"
              inputMode="decimal"
              defaultValue={formatPriceInput(settings.freeShippingThresholdKurus)}
              required
            />
          </div>
          <p className="muted">Sepet tutarı eşiğe ulaştığında kargo ücreti alınmaz.</p>
          <button className="button" type="submit">
            Kaydet
          </button>
        </form>
      </section>
    </div>
  );
}
