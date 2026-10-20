"use client";

import { useActionState } from "react";
import { formatPrice } from "@/lib/format-price";
import { ORDER_STATUS_LABELS, REQUEST_KIND_LABELS, REQUEST_STATUS_LABELS } from "@/lib/order-status";
import {
  lookupOrderAction,
  requestGuestOrderChangeAction,
  type GuestRequestState,
  type LookupState,
  type LookupView,
} from "./actions";

const INITIAL: LookupState = { error: null, order: null };

export function LookupForm() {
  const [state, formAction, pending] = useActionState(lookupOrderAction, INITIAL);
  const { order, error } = state;

  return (
    <>
      <form action={formAction} className="admin-form">
        <div className="field">
          <label htmlFor="orderNumber">Sipariş numarası</label>
          <input id="orderNumber" name="orderNumber" required autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="email">E-posta</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button" type="submit" disabled={pending}>
          Siparişi sorgula
        </button>
      </form>

      {order && (
        <section className="admin-card" aria-live="polite">
          <p className="eyebrow">Sipariş no {order.orderNumber}</p>
          <h2>{ORDER_STATUS_LABELS[order.status]}</h2>
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
          <p>
            Toplam (KDV dahil): <strong>{formatPrice(order.totalKurus)}</strong>
          </p>
          <RequestPanel key={order.orderNumber} order={order} />
        </section>
      )}
    </>
  );
}

const NO_REQUEST: GuestRequestState = { error: null, request: null };

function RequestPanel({ order }: { order: LookupView }) {
  const [state, formAction, pending] = useActionState(requestGuestOrderChangeAction, NO_REQUEST);
  const kind = order.requestKind;
  const request = state.request ?? order.request;

  return (
    <div>
      <h3>İptal / iade</h3>
      {state.request && (
        <p className="form-success" role="status">
          Talebiniz alındı.
        </p>
      )}
      {request && (
        <p>
          {REQUEST_KIND_LABELS[request.kind]}: <strong>{REQUEST_STATUS_LABELS[request.status]}</strong>
          <br />
          <span className="muted">{request.reason}</span>
        </p>
      )}
      {kind && order.canRequest && !state.request && (
        <form action={formAction} className="admin-form">
          <input type="hidden" name="orderNumber" value={order.orderNumber} />
          <input type="hidden" name="email" value={order.email} />
          <div className="field">
            <label htmlFor="reason">{kind === "cancellation" ? "İptal gerekçeniz" : "İade gerekçeniz"}</label>
            <textarea id="reason" name="reason" rows={3} required />
          </div>
          {state.error && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}
          <button className="button" type="submit" disabled={pending}>
            {kind === "cancellation" ? "İptal talebi oluştur" : "İade talebi oluştur"}
          </button>
        </form>
      )}
      {!kind && !request && <p className="muted">Bu sipariş için talep oluşturulamaz.</p>}
    </div>
  );
}
