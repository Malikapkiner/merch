"use client";

import Link from "next/link";
import { useState } from "react";
import { addVariantToCart } from "@/lib/cart-store";
import { formatPrice, VAT_INCLUDED_LABEL } from "@/lib/format-price";
import { parseQuantityInput } from "@/lib/quantity-input";

export type VariantOption = { id: number; name: string; priceKurus: number; soldOut: boolean };

/** Variant selection, live price and "add to cart" for a Product. */
export function BuyBox({ variants }: { variants: VariantOption[] }) {
  const firstAvailable = variants.find((v) => !v.soldOut);
  const [selectedId, setSelectedId] = useState<number | null>(firstAvailable?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const selected = variants.find((v) => v.id === selectedId);

  function select(id: number) {
    setSelectedId(id);
    setAdded(false);
  }

  function addToCart() {
    if (!selected) return;
    addVariantToCart(selected.id, quantity);
    setAdded(true);
  }

  return (
    <div className="buy-box">
      <fieldset className="variant-picker">
        <legend>Seçenek</legend>
        {variants.map((v) => (
          <label key={v.id} className="variant-option" data-sold-out={v.soldOut || undefined}>
            <input
              type="radio"
              name="variant"
              value={v.id}
              checked={v.id === selectedId}
              disabled={v.soldOut}
              onChange={() => select(v.id)}
            />
            <span>{v.name}</span>
            {v.soldOut && <span className="sold-out">Tükendi</span>}
          </label>
        ))}
      </fieldset>

      {selected ? (
        <>
          <p className="price price--large" aria-live="polite">
            {formatPrice(selected.priceKurus)} <span className="vat-note">{VAT_INCLUDED_LABEL}</span>
          </p>
          <div className="buy-box__actions">
            <label className="quantity-field">
              Adet
              <input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(event) => {
                  setQuantity(parseQuantityInput(event.target.value));
                  setAdded(false);
                }}
              />
            </label>
            <button className="button" type="button" onClick={addToCart}>
              Sepete ekle
            </button>
          </div>
          {added && (
            <p className="form-success" role="status">
              Sepete eklendi.{" "}
              <Link className="link-button" href="/sepet">
                Sepete git
              </Link>
            </p>
          )}
        </>
      ) : (
        <p className="sold-out">{variants.length > 0 ? "Tükendi" : "Şu an satışta değil"}</p>
      )}
    </div>
  );
}
