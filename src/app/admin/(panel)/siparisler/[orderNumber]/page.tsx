import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminStatus } from "@/components/admin-status";
import { requireAdmin } from "@/lib/admin-session";
import { formatPrice } from "@/lib/format-price";
import { getOrders } from "@/lib/orders";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, REQUEST_KIND_LABELS, REQUEST_STATUS_LABELS } from "@/lib/order-status";
import { getDocument } from "@/modules/legal";
import { nextStatuses } from "@/modules/orders";
import type { OrderStatus } from "@/modules/orders";
import { changeOrderStatusAction, confirmBankTransferAction, resolveRequestAction } from "../../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sipariş" };

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ hata?: string; durum?: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" });

const STEP_BUTTONS: Readonly<Partial<Record<OrderStatus, string>>> = {
  preparing: "Hazırlanıyor yap",
  shipped: "Kargoya ver",
  delivered: "Teslim edildi yap",
  cancelled: "İptal et",
  returned: "İade al",
};

export default async function AdminOrderPage({ params, searchParams }: Props) {
  await requireAdmin();
  const [{ orderNumber }, { hata: error, durum: saved }] = await Promise.all([params, searchParams]);
  const order = await getOrders().getOrder(orderNumber);
  if (!order) notFound();
  const request = await getOrders().getRequest(orderNumber);
  const { shippingAddress: address, billing } = order;
  const steps = nextStatuses(order.status);
  const closing = steps.filter((step) => step === "cancelled" || step === "returned");

  return (
    <div>
      <p className="breadcrumb">
        <Link href="/admin/siparisler">← Siparişler</Link>
      </p>
      <h1 className="heading-section">Sipariş {order.orderNumber}</h1>
      <AdminStatus error={error} saved={saved} />
      <p>
        <strong>{ORDER_STATUS_LABELS[order.status]}</strong> · {PAYMENT_METHOD_LABELS[order.paymentMethod]} ·{" "}
        {dateFormatter.format(order.createdAt)}
        {order.trackingNumber && <> · Takip no: {order.trackingNumber}</>}
      </p>
      {order.adminNote && <p>Not: {order.adminNote}</p>}

      {request && (
        <section className="admin-card">
          <h2>
            {REQUEST_KIND_LABELS[request.kind]} · {REQUEST_STATUS_LABELS[request.status]}
          </h2>
          <p>
            {dateFormatter.format(request.createdAt)}
            <br />
            Müşterinin gerekçesi: {request.reason}
          </p>
          {request.resolutionNote && <p>Not: {request.resolutionNote}</p>}
          {request.status === "open" && (
            <form action={resolveRequestAction} className="admin-form">
              <input type="hidden" name="orderNumber" value={order.orderNumber} />
              <div className="field">
                <label htmlFor="requestNote">Not (iyzico panelinden para iadesi elle yapılır)</label>
                <textarea id="requestNote" name="note" rows={2} />
              </div>
              <div className="admin-form--inline">
                <button className="button" type="submit" name="outcome" value="approve">
                  {request.kind === "cancellation" ? "Onayla ve İptal et" : "Onayla ve İade al"}
                </button>
                <button className="button" type="submit" name="outcome" value="reject">
                  Reddet
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="admin-card">
        <h2>İçerik</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Ürün</th>
              <th scope="col">Adet</th>
              <th scope="col">Birim fiyat</th>
              <th scope="col">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.variantId}>
                <td>
                  {line.productName} · {line.variantName}
                </td>
                <td>{line.quantity}</td>
                <td>{formatPrice(line.unitPriceKurus)}</td>
                <td>{formatPrice(line.lineTotalKurus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Ara toplam {formatPrice(order.subtotalKurus)} · Kargo {formatPrice(order.shippingFeeKurus)} ·{" "}
          <strong>Toplam {formatPrice(order.totalKurus)}</strong> (KDV dahil)
        </p>
      </section>

      <section className="admin-card">
        <h2>Müşteri ve teslimat</h2>
        <p>
          {address.fullName}
          <br />
          {order.email} · {order.phone}
        </p>
        <p>
          {address.neighbourhood} {address.addressLine}
          <br />
          {address.district} / {address.province}
        </p>
      </section>

      <section className="admin-card">
        <h2>Fatura bilgisi</h2>
        <p>
          {billing.name}
          {billing.taxNumber && <> · VKN/TCKN: {billing.taxNumber}</>}
          <br />
          {billing.neighbourhood} {billing.addressLine}
          <br />
          {billing.district} / {billing.province}
        </p>
      </section>

      <section className="admin-card">
        <h2>Onaylanan belgeler</h2>
        <ul>
          {Object.entries(order.acceptedDocuments).map(([slug, version]) => (
            <li key={slug}>
              {getDocument(slug)?.title ?? slug} · sürüm {version}
            </li>
          ))}
        </ul>
      </section>

      {steps.length > 0 && (
        <section className="admin-card">
          <h2>Durumu değiştir</h2>
          {order.status === "awaiting_payment" && order.paymentMethod === "bank_transfer" && (
            <form action={confirmBankTransferAction} className="admin-form--inline">
              <input type="hidden" name="orderNumber" value={order.orderNumber} />
              <button className="button" type="submit">
                Havaleyi onayla (Ödendi yap)
              </button>
            </form>
          )}
          {steps.includes("preparing") && (
            <form action={changeOrderStatusAction} className="admin-form--inline">
              <input type="hidden" name="orderNumber" value={order.orderNumber} />
              <input type="hidden" name="status" value="preparing" />
              <button className="button" type="submit">
                {STEP_BUTTONS.preparing}
              </button>
            </form>
          )}
          {steps.includes("shipped") && (
            <form action={changeOrderStatusAction} className="admin-form--inline">
              <input type="hidden" name="orderNumber" value={order.orderNumber} />
              <input type="hidden" name="status" value="shipped" />
              <div className="field">
                <label htmlFor="trackingNumber">Kargo takip numarası</label>
                <input id="trackingNumber" name="trackingNumber" required />
              </div>
              <button className="button" type="submit">
                {STEP_BUTTONS.shipped}
              </button>
            </form>
          )}
          {steps.includes("delivered") && (
            <form action={changeOrderStatusAction} className="admin-form--inline">
              <input type="hidden" name="orderNumber" value={order.orderNumber} />
              <input type="hidden" name="status" value="delivered" />
              <button className="button" type="submit">
                {STEP_BUTTONS.delivered}
              </button>
            </form>
          )}
          {closing.length > 0 && (
            <form action={changeOrderStatusAction} className="admin-form">
              <input type="hidden" name="orderNumber" value={order.orderNumber} />
              <div className="field">
                <label htmlFor="note">Not (iyzico panelinden para iadesi elle yapılır)</label>
                <textarea id="note" name="note" rows={2} />
              </div>
              <div className="admin-form--inline">
                {closing.map((step) => (
                  <button key={step} className="button" type="submit" name="status" value={step}>
                    {STEP_BUTTONS[step]}
                  </button>
                ))}
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
