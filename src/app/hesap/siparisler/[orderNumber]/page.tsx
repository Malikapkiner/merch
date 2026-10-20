import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format-price";
import { requireMember } from "@/lib/member-session";
import { ORDER_STATUS_LABELS, REQUEST_KIND_LABELS, REQUEST_STATUS_LABELS } from "@/lib/order-status";
import { getOrders } from "@/lib/orders";
import { requestKindFor } from "@/modules/orders";
import { requestOrderChangeAction } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sipariş detayı", robots: { index: false } };

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ hata?: string; durum?: string }>;
};

export default async function MemberOrderPage({ params, searchParams }: Props) {
  const [{ orderNumber }, { hata: error, durum: saved }, member] = await Promise.all([
    params,
    searchParams,
    requireMember(),
  ]);
  const order = await getOrders().getOrder(orderNumber);
  // Another Member's Order looks the same as one that doesn't exist.
  if (!order || order.memberId !== member.id) notFound();
  const { shippingAddress: address } = order;
  const request = await getOrders().getRequest(orderNumber);
  const kind = requestKindFor(order.status);

  return (
    <div className="container section narrow">
      <p className="eyebrow">Sipariş no {order.orderNumber}</p>
      <h1 className="heading-section">{ORDER_STATUS_LABELS[order.status]}</h1>
      {order.trackingNumber && (
        <p>
          Kargo takip no: <strong>{order.trackingNumber}</strong>
        </p>
      )}

      <ul className="checkout__lines">
        {order.lines.map((line) => (
          <li key={line.variantId}>
            <span>
              {line.productName} · {line.variantName} × {line.quantity}
            </span>
            <span>{formatPrice(line.lineTotalKurus)}</span>
          </li>
        ))}
      </ul>
      <dl className="cart-summary">
        <div>
          <dt>Ara toplam</dt>
          <dd>{formatPrice(order.subtotalKurus)}</dd>
        </div>
        <div>
          <dt>Kargo</dt>
          <dd>{order.shippingFeeKurus === 0 ? "Ücretsiz" : formatPrice(order.shippingFeeKurus)}</dd>
        </div>
        <div className="cart-summary__total">
          <dt>Toplam (KDV dahil)</dt>
          <dd>{formatPrice(order.totalKurus)}</dd>
        </div>
      </dl>

      <section className="admin-card">
        <h2>Teslimat adresi</h2>
        <p>
          {address.fullName}
          <br />
          {address.neighbourhood}, {address.addressLine}
          <br />
          {address.district} / {address.province}
        </p>
      </section>

      <section className="admin-card">
        <h2>İptal / iade</h2>
        {saved === "talep" && (
          <p className="form-success" role="status">
            Talebiniz alındı. Sonucu bu sayfadan takip edebilirsiniz.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {request && (
          <p>
            {REQUEST_KIND_LABELS[request.kind]}: <strong>{REQUEST_STATUS_LABELS[request.status]}</strong>
            <br />
            <span className="muted">{request.reason}</span>
          </p>
        )}
        {kind && request?.status !== "open" && (
          <form action={requestOrderChangeAction} className="admin-form">
            <input type="hidden" name="orderNumber" value={order.orderNumber} />
            <div className="field">
              <label htmlFor="reason">{kind === "cancellation" ? "İptal gerekçeniz" : "İade gerekçeniz"}</label>
              <textarea id="reason" name="reason" rows={3} required />
            </div>
            <button className="button" type="submit">
              {kind === "cancellation" ? "İptal talebi oluştur" : "İade talebi oluştur"}
            </button>
          </form>
        )}
        {!kind && !request && <p className="muted">Bu sipariş için talep oluşturulamaz.</p>}
        <p className="muted">Para iadesi, talep onaylandıktan sonra ödeme yönteminize elle yapılır.</p>
      </section>

      <p>
        <Link className="link-button" href="/hesap">
          Tüm siparişlerim
        </Link>
      </p>
    </div>
  );
}
