"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { changeCartQuantity, removeCartVariant, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format-price";
import { parseQuantityInput } from "@/lib/quantity-input";
import { priceCart, type CartVariant } from "@/modules/cart";
import type { ShippingSettings } from "@/modules/shipping";

type CartData = { key: string; variants: CartVariant[]; settings: ShippingSettings };

export function CartView() {
  const items = useCart();
  const idsKey = items.map((item) => item.variantId).join(",");
  const [data, setData] = useState<CartData | null>(null);
  const [failed, setFailed] = useState(false);

  // Refetches only when the set of Variants changes; quantities are repriced locally.
  useEffect(() => {
    if (idsKey === "") return;
    let active = true;
    fetch(`/api/cart?variantIds=${idsKey}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("cart fetch failed"))))
      .then((payload: { variants: CartVariant[]; settings: ShippingSettings }) => {
        if (active) {
          setData({ key: idsKey, ...payload });
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [idsKey]);

  if (items.length === 0) {
    return (
      <p>
        Sepetiniz boş. <Link className="link-button" href="/urunler">Ürünlere göz atın</Link>.
      </p>
    );
  }

  if (failed) {
    return (
      <p className="form-error" role="alert">
        Sepet yüklenemedi. Lütfen sayfayı yenileyin.
      </p>
    );
  }

  // A stale response for a previous cart is ignored until the current one arrives.
  const totals = data && data.key === idsKey ? priceCart(items, data.variants, data.settings) : null;
  if (!totals) return <p>Sepet yükleniyor…</p>;

  const unavailable = items.length - totals.lines.length;

  return (
    <div className="cart">
      {unavailable > 0 && (
        <p className="form-error" role="alert">
          Bazı ürünler artık satışta değil ve toplama katılmadı.
        </p>
      )}

      <ul className="cart-lines">
        {totals.lines.map((line) => (
          <li key={line.id} className="cart-line">
            <div className="cart-line__info">
              <Link href={`/urunler/${line.productSlug}`}>{line.productName}</Link>
              <p className="muted">{line.name}</p>
              <p className="price">
                {formatPrice(line.priceKurus)} <span className="vat-note">adet</span>
              </p>
              {line.exceedsStock && (
                <p className="cart-warning" role="status">
                  Stokta en fazla {line.stock} adet var.
                </p>
              )}
            </div>
            <label className="quantity-field">
              Adet
              <input
                type="number"
                min={1}
                step={1}
                value={line.quantity}
                onChange={(event) => changeCartQuantity(line.id, parseQuantityInput(event.target.value))}
              />
            </label>
            <p className="cart-line__total">{formatPrice(line.lineTotalKurus)}</p>
            <button className="link-button" type="button" onClick={() => removeCartVariant(line.id)}>
              Sil
            </button>
          </li>
        ))}
      </ul>

      <dl className="cart-summary">
        <div>
          <dt>Ara toplam</dt>
          <dd>{formatPrice(totals.subtotalKurus)}</dd>
        </div>
        <div>
          <dt>Kargo</dt>
          <dd>{totals.shippingFeeKurus === 0 ? "Ücretsiz" : formatPrice(totals.shippingFeeKurus)}</dd>
        </div>
        <div className="cart-summary__total">
          <dt>Toplam</dt>
          <dd>{formatPrice(totals.totalKurus)}</dd>
        </div>
      </dl>

      {totals.remainingForFreeShippingKurus > 0 ? (
        <p className="free-shipping-note">
          Ücretsiz kargo için <strong>{formatPrice(totals.remainingForFreeShippingKurus)}</strong> daha ekleyin.
        </p>
      ) : (
        <p className="free-shipping-note form-success">Kargo ücretsiz.</p>
      )}

      <p className="cart-continue">
        <Link className="button" href="/urunler">
          Alışverişe devam et
        </Link>
      </p>
    </div>
  );
}
