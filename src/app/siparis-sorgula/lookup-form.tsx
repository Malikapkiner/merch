"use client";

import { useActionState } from "react";
import { formatPrice } from "@/lib/format-price";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { lookupOrderAction, type LookupState } from "./actions";

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
        </section>
      )}
    </>
  );
}
