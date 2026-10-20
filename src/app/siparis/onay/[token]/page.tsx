import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format-price";
import { getOrders } from "@/lib/orders";
import { ClearCart } from "./clear-cart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Siparişiniz alındı", robots: { index: false } };

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ yeni?: string }> };

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const [{ token }, { yeni: justPaid }] = await Promise.all([params, searchParams]);
  const order = await getOrders().getOrderByAccessToken(token);
  if (!order || order.status === "awaiting_payment" || order.status === "cancelled") notFound();
  const { shippingAddress: address } = order;

  return (
    <div className="container section narrow">
      {justPaid && <ClearCart />}
      <p className="eyebrow">Sipariş no {order.orderNumber}</p>
      <h1 className="heading-section">Siparişiniz alındı</h1>
      <p className="lead">
        Ödemeniz onaylandı. Siparişinizi hazırlayıp kargoya verdiğimizde {order.email} adresine haber vereceğiz.
      </p>

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

      <p className="cart-continue">
        <Link className="button" href="/urunler">
          Alışverişe devam et
        </Link>
      </p>
    </div>
  );
}
