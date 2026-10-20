import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format-price";
import { fakePaymentProvider } from "@/lib/payments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Test ödemesi", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string }> };

/** Stands in for the provider's hosted payment page while the fake provider is active. */
export default async function FakePaymentPage({ searchParams }: Props) {
  const fake = fakePaymentProvider();
  if (!fake) notFound();
  const { token = "" } = await searchParams;
  const session = fake.session(token);
  if (!session) notFound();

  return (
    <div className="container section narrow">
      <p className="eyebrow">Test ödeme sağlayıcısı</p>
      <h1 className="heading-section">Ödeme</h1>
      <p className="lead">
        Sipariş {session.orderNumber}: <strong>{formatPrice(session.amountKurus)}</strong>
      </p>
      <p className="muted">Bu sayfa gerçek bir ödeme almaz; kart ödemesi iyzico ile gelecek.</p>
      {/* A native post, so the browser fully navigates back like it would from a real provider. */}
      <form action="/odeme/sahte/tamamla" method="post" className="buy-box__actions">
        <input type="hidden" name="token" value={token} />
        <button className="button" type="submit" name="outcome" value="approve">
          Ödemeyi onayla
        </button>
        <button className="link-button" type="submit" name="outcome" value="decline">
          Ödemeyi reddet
        </button>
      </form>
    </div>
  );
}
