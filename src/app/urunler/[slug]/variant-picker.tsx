"use client";

import { useState } from "react";
import { formatPrice, VAT_INCLUDED_LABEL } from "@/lib/format-price";

export type VariantOption = { id: number; name: string; priceKurus: number; soldOut: boolean };

export function VariantPicker({ variants }: { variants: VariantOption[] }) {
  const firstAvailable = variants.find((v) => !v.soldOut);
  const [selectedId, setSelectedId] = useState<number | null>(firstAvailable?.id ?? null);
  const selected = variants.find((v) => v.id === selectedId);

  return (
    <div className="variant-picker">
      <fieldset>
        <legend>Seçenek</legend>
        {variants.map((v) => (
          <label key={v.id} className="variant-option" data-sold-out={v.soldOut || undefined}>
            <input
              type="radio"
              name="variant"
              value={v.id}
              checked={v.id === selectedId}
              disabled={v.soldOut}
              onChange={() => setSelectedId(v.id)}
            />
            <span>{v.name}</span>
            {v.soldOut && <span className="sold-out">Tükendi</span>}
          </label>
        ))}
      </fieldset>
      {selected ? (
        <p className="price price--large" aria-live="polite">
          {formatPrice(selected.priceKurus)} <span className="vat-note">{VAT_INCLUDED_LABEL}</span>
        </p>
      ) : (
        <p className="sold-out">{variants.length > 0 ? "Tükendi" : "Şu an satışta değil"}</p>
      )}
    </div>
  );
}
