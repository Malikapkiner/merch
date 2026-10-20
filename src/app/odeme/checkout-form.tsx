"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { formatPrice } from "@/lib/format-price";
import { usePricedCart } from "@/lib/use-priced-cart";
import type { CheckoutField } from "@/modules/orders";
import { placeOrderAction } from "./actions";

type DistrictsByProvince = Record<string, string[]>;

const FIELD_ERRORS: Record<CheckoutField, string> = {
  email: "Geçerli bir e-posta adresi girin.",
  phone: "Geçerli bir telefon numarası girin (ör. 0532 123 45 67).",
  fullName: "Ad soyad girin.",
  province: "Listeden bir il seçin.",
  district: "Listeden bir ilçe seçin.",
  neighbourhood: "Mahalle girin.",
  addressLine: "Açık adres girin.",
  billingName: "Fatura adı girin.",
  billingProvince: "Fatura için listeden bir il seçin.",
  billingDistrict: "Fatura için listeden bir ilçe seçin.",
  billingNeighbourhood: "Fatura mahallesini girin.",
  billingAddressLine: "Fatura açık adresini girin.",
  taxNumber: "Vergi no 10 haneli VKN veya 11 haneli TCKN olmalıdır.",
};

function FieldError({ field, fields }: { field: CheckoutField; fields: CheckoutField[] }) {
  if (!fields.includes(field)) return null;
  return (
    <span className="form-error muted" id={`${field}-error`}>
      {FIELD_ERRORS[field]}
    </span>
  );
}

/** Il and ilçe selects; the ilçe list follows the chosen il. */
function ProvinceDistrictFields({
  prefix,
  districtsByProvince,
  fields,
}: {
  prefix: "" | "billing";
  districtsByProvince: DistrictsByProvince;
  fields: CheckoutField[];
}) {
  const [province, setProvince] = useState("");
  const provinceName = (prefix ? "billingProvince" : "province") as CheckoutField;
  const districtName = (prefix ? "billingDistrict" : "district") as CheckoutField;

  return (
    <>
      <div className="field">
        <label htmlFor={provinceName}>İl</label>
        <select
          id={provinceName}
          name={provinceName}
          required
          value={province}
          onChange={(event) => setProvince(event.target.value)}
          aria-invalid={fields.includes(provinceName) || undefined}
        >
          <option value="">Seçin</option>
          {Object.keys(districtsByProvince).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <FieldError field={provinceName} fields={fields} />
      </div>
      <div className="field">
        <label htmlFor={districtName}>İlçe</label>
        {/* Re-mounted per il so a district from the previous il never lingers. */}
        <select
          key={province}
          id={districtName}
          name={districtName}
          required
          disabled={!province}
          defaultValue=""
          aria-invalid={fields.includes(districtName) || undefined}
        >
          <option value="">Seçin</option>
          {(districtsByProvince[province] ?? []).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <FieldError field={districtName} fields={fields} />
      </div>
    </>
  );
}

function TextField({
  name,
  label,
  fields,
  ...input
}: {
  name: CheckoutField;
  label: string;
  fields: CheckoutField[];
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} aria-invalid={fields.includes(name) || undefined} {...input} />
      <FieldError field={name} fields={fields} />
    </div>
  );
}

export function CheckoutForm({ districtsByProvince }: { districtsByProvince: DistrictsByProvince }) {
  const cart = usePricedCart();
  const [state, formAction, pending] = useActionState(placeOrderAction, undefined);
  const [billingSame, setBillingSame] = useState(true);
  const fields = state?.fields ?? [];

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
  const { totals } = cart;

  if (totals.exceedsStock || totals.lines.length === 0) {
    return (
      <p className="form-error" role="alert">
        Sepetinizdeki bazı ürünlerin stoğu yetersiz. <Link className="link-button" href="/sepet">Sepete dönün</Link>.
      </p>
    );
  }

  // Submitted by hand so a validation error doesn't reset what the Customer typed.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const items = totals.lines.map((line) => ({ variantId: line.id, quantity: line.quantity }));

  return (
    <form className="checkout" onSubmit={submit}>
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="checkout__details">
        <section className="admin-form">
          <h2>İletişim</h2>
          <TextField name="email" label="E-posta" type="email" autoComplete="email" required fields={fields} />
          <TextField
            name="phone"
            label="Telefon"
            type="tel"
            autoComplete="tel"
            placeholder="0532 123 45 67"
            required
            fields={fields}
          />
        </section>

        <section className="admin-form">
          <h2>Teslimat adresi</h2>
          <TextField name="fullName" label="Ad soyad" autoComplete="name" required fields={fields} />
          <ProvinceDistrictFields prefix="" districtsByProvince={districtsByProvince} fields={fields} />
          <TextField name="neighbourhood" label="Mahalle" required fields={fields} />
          <TextField
            name="addressLine"
            label="Açık adres (cadde, sokak, bina ve daire no)"
            autoComplete="street-address"
            required
            fields={fields}
          />
        </section>

        <section className="admin-form">
          <h2>Fatura bilgileri</h2>
          <TextField
            name="billingName"
            label="Fatura adı veya unvanı (boş bırakılırsa alıcı adı)"
            autoComplete="organization"
            fields={fields}
          />
          <TextField name="taxNumber" label="Vergi no / TCKN (isteğe bağlı)" inputMode="numeric" fields={fields} />
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="billingSameAsShipping"
              checked={billingSame}
              onChange={(event) => setBillingSame(event.target.checked)}
            />
            Fatura adresi teslimat adresiyle aynı
          </label>
          {!billingSame && (
            <>
              <ProvinceDistrictFields prefix="billing" districtsByProvince={districtsByProvince} fields={fields} />
              <TextField name="billingNeighbourhood" label="Mahalle" required fields={fields} />
              <TextField name="billingAddressLine" label="Açık adres" required fields={fields} />
            </>
          )}
        </section>
      </div>

      <aside className="checkout__summary">
        <h2>Sipariş özeti</h2>
        <ul className="checkout__lines">
          {totals.lines.map((line) => (
            <li key={line.id}>
              <span>
                {line.productName} · {line.name} × {line.quantity}
              </span>
              <span>{formatPrice(line.lineTotalKurus)}</span>
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
            <dt>Toplam (KDV dahil)</dt>
            <dd>{formatPrice(totals.totalKurus)}</dd>
          </div>
        </dl>

        <label className="checkbox-field">
          <input type="checkbox" name="acceptedContracts" required />
          <span>
            <Link className="link-button" href="/yasal/mesafeli-satis-sozlesmesi" target="_blank">
              Mesafeli Satış Sözleşmesi
            </Link>
            &apos;ni ve{" "}
            <Link className="link-button" href="/yasal/on-bilgilendirme-formu" target="_blank">
              Ön Bilgilendirme Formu
            </Link>
            &apos;nu okudum, onaylıyorum.
          </span>
        </label>

        {state?.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}

        <button className="button" type="submit" disabled={pending}>
          {pending ? "Yönlendiriliyor…" : "Ödemeye geç"}
        </button>
      </aside>
    </form>
  );
}
