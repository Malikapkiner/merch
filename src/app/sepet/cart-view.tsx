"use client";

import Link from "next/link";
import { changeCartQuantity, removeCartVariant } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format-price";
import { parseQuantityInput } from "@/lib/quantity-input";
import { usePricedCart } from "@/lib/use-priced-cart";

export function CartView() {
  const cart = usePricedCart();

  if (cart.state === "empty") {
    return (
      <p>
        Sepetiniz boş. <Link className="link-button" href="/urunler">Ürünlere göz atın</Link>.
      </p>
    );
  }

  if (cart.state === "failed") {
    return (
      <p className="form-error" role="alert">
        Sepet yüklenemedi. Lütfen sayfayı yenileyin.
      </p>
    );
  }

  if (cart.state === "loading") return <p>Sepet yükleniyor…</p>;
  const { totals, unavailable } = cart;

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
        {totals.lines.length > 0 && !totals.exceedsStock && (
          <Link className="button" href="/odeme">
            Ödemeye geç
          </Link>
        )}{" "}
        <Link className="link-button" href="/urunler">
          Alışverişe devam et
        </Link>
      </p>
    </div>
  );
}
