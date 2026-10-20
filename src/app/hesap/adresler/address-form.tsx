"use client";

import { useState } from "react";
import { saveAddressAction } from "../actions";

type Props = {
  districtsByProvince: Record<string, string[]>;
  address?: {
    id: number;
    fullName: string;
    phone: string;
    province: string;
    district: string;
    neighbourhood: string;
    addressLine: string;
  };
};

/** Add or edit form; the ilçe list follows the chosen il. */
export function AddressForm({ districtsByProvince, address }: Props) {
  const [province, setProvince] = useState(address?.province ?? "");

  return (
    <form action={saveAddressAction} className="admin-form">
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="field">
        <label htmlFor="fullName">Ad soyad</label>
        <input id="fullName" name="fullName" required autoComplete="name" defaultValue={address?.fullName} />
      </div>
      <div className="field">
        <label htmlFor="phone">Telefon</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="0532 123 45 67"
          defaultValue={address?.phone}
        />
      </div>
      <div className="field">
        <label htmlFor="province">İl</label>
        <select id="province" name="province" required value={province} onChange={(event) => setProvince(event.target.value)}>
          <option value="">Seçin</option>
          {Object.keys(districtsByProvince).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="district">İlçe</label>
        {/* Re-mounted per il so a district from the previous il never lingers. */}
        <select
          key={province}
          id="district"
          name="district"
          required
          disabled={!province}
          defaultValue={province === address?.province ? address.district : ""}
        >
          <option value="">Seçin</option>
          {(districtsByProvince[province] ?? []).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="neighbourhood">Mahalle</label>
        <input id="neighbourhood" name="neighbourhood" required defaultValue={address?.neighbourhood} />
      </div>
      <div className="field">
        <label htmlFor="addressLine">Açık adres (cadde, sokak, bina ve daire no)</label>
        <input
          id="addressLine"
          name="addressLine"
          required
          autoComplete="street-address"
          defaultValue={address?.addressLine}
        />
      </div>
      <button className="button" type="submit">
        {address ? "Adresi güncelle" : "Adresi ekle"}
      </button>
    </form>
  );
}
