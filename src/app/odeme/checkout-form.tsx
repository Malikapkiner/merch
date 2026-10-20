"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent, type InputHTMLAttributes } from "react";
import type { MemberAddress } from "@/modules/accounts";
import { bankAccount } from "@/config/site";
import { formatPrice } from "@/lib/format-price";
import { usePricedCart } from "@/lib/use-priced-cart";
import type { CheckoutField, PaymentMethod } from "@/modules/orders";
import { placeOrderAction } from "./actions";

type DistrictsByProvince = Record<string, string[]>;

/** A signed-in Member: their e-posta and saved addresses prefill the form. */
type CheckoutMember = { email: string; addresses: MemberAddress[] };

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
  initial,
}: {
  prefix: "" | "billing";
  districtsByProvince: DistrictsByProvince;
  fields: CheckoutField[];
  initial?: { province: string; district: string };
}) {
  const [province, setProvince] = useState(initial?.province ?? "");
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
          defaultValue={province === initial?.province ? initial.district : ""}
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

export function CheckoutForm({
  districtsByProvince,
  member,
}: {
  districtsByProvince: DistrictsByProvince;
  member: CheckoutMember | null;
}) {
  const cart = usePricedCart();
  const [state, formAction, pending] = useActionState(placeOrderAction, undefined);
  const [billingSame, setBillingSame] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  // The Member's saved address in use; the first one is ready when they arrive.
  const [addressId, setAddressId] = useState<number | null>(member?.addresses[0]?.id ?? null);
  const saved = member?.addresses.find((address) => address.id === addressId);
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
          <TextField
            name="email"
            label="E-posta"
            type="email"
            autoComplete="email"
            required
            defaultValue={member?.email}
            fields={fields}
          />
          <TextField
            key={`phone-${addressId}`}
            name="phone"
            label="Telefon"
            defaultValue={saved?.phone}
            type="tel"
            autoComplete="tel"
            placeholder="0532 123 45 67"
            required
            fields={fields}
          />
        </section>

        <section className="admin-form">
          <h2>Teslimat adresi</h2>
          {member && member.addresses.length > 0 && (
            <div className="field">
              <label htmlFor="savedAddress">Kayıtlı adreslerim</label>
              <select
                id="savedAddress"
                value={addressId ?? ""}
                onChange={(event) => setAddressId(event.target.value ? Number(event.target.value) : null)}
              >
                {member.addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.fullName} · {address.neighbourhood}, {address.district}/{address.province}
                  </option>
                ))}
                <option value="">Yeni adres gir</option>
              </select>
            </div>
          )}
          {/* Re-mounted per chosen address so its values replace what was shown before. */}
          <div key={`address-${addressId}`} className="admin-form">
            <TextField
              name="fullName"
              label="Ad soyad"
              autoComplete="name"
              required
              defaultValue={saved?.fullName}
              fields={fields}
            />
            <ProvinceDistrictFields
              prefix=""
              districtsByProvince={districtsByProvince}
              fields={fields}
              initial={saved}
            />
            <TextField name="neighbourhood" label="Mahalle" required defaultValue={saved?.neighbourhood} fields={fields} />
            <TextField
              name="addressLine"
              label="Açık adres (cadde, sokak, bina ve daire no)"
              autoComplete="street-address"
              required
              defaultValue={saved?.addressLine}
              fields={fields}
            />
          </div>
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

        <fieldset className="admin-form">
          <legend>Ödeme yöntemi</legend>
          <label className="checkbox-field">
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === "card"}
              onChange={() => setPaymentMethod("card")}
            />
            Kredi / banka kartı
          </label>
          <label className="checkbox-field">
            <input
              type="radio"
              name="paymentMethod"
              value="bank_transfer"
              checked={paymentMethod === "bank_transfer"}
              onChange={() => setPaymentMethod("bank_transfer")}
            />
            Havale / EFT
          </label>
          {paymentMethod === "bank_transfer" && (
            <div>
              <p>
                Siparişi tamamladığınızda sipariş numaranız oluşur; havale açıklamasına yazmanız yeterli. Ödemeniz
                hesabımıza ulaşıp onaylandığında siparişiniz hazırlanmaya başlar.
              </p>
              <p>
                {bankAccount.bankName}
                <br />
                Hesap sahibi: {bankAccount.accountHolder}
                <br />
                IBAN: {bankAccount.iban}
              </p>
            </div>
          )}
        </fieldset>

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
          {pending ? "Yönlendiriliyor…" : paymentMethod === "bank_transfer" ? "Siparişi tamamla" : "Ödemeye geç"}
        </button>
      </aside>
    </form>
  );
}
