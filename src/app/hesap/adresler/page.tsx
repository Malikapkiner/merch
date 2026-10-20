import type { Metadata } from "next";
import Link from "next/link";
import { AdminStatus } from "@/components/admin-status";
import { requireMember } from "@/lib/member-session";
import { getMembers } from "@/lib/members";
import { listDistricts, listProvinces } from "@/modules/address";
import { deleteAddressAction } from "../actions";
import { AddressForm } from "./address-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Adreslerim", robots: { index: false } };

type Props = { searchParams: Promise<{ hata?: string; kaydedildi?: string; duzenle?: string }> };

export default async function AddressesPage({ searchParams }: Props) {
  const [{ hata, kaydedildi, duzenle }, member] = await Promise.all([searchParams, requireMember()]);
  const addresses = await getMembers().listAddresses(member.id);
  const editing = addresses.find((address) => String(address.id) === duzenle);
  const districtsByProvince = Object.fromEntries(listProvinces().map((province) => [province, listDistricts(province)]));

  return (
    <div className="container section narrow">
      <h1 className="heading-section">Adreslerim</h1>
      <AdminStatus error={hata} saved={kaydedildi} />

      {addresses.length === 0 ? (
        <p>Kayıtlı adresiniz yok.</p>
      ) : (
        addresses.map((address) => (
          <section className="admin-card" key={address.id}>
            <p>
              {address.fullName} · {address.phone}
              <br />
              {address.neighbourhood}, {address.addressLine}
              <br />
              {address.district} / {address.province}
            </p>
            <Link className="link-button" href={`/hesap/adresler?duzenle=${address.id}`}>
              Düzenle
            </Link>
            <form action={deleteAddressAction}>
              <input type="hidden" name="id" value={address.id} />
              <button className="link-button" type="submit">
                Sil
              </button>
            </form>
          </section>
        ))
      )}

      <h2>{editing ? "Adresi düzenle" : "Yeni adres ekle"}</h2>
      {/* Keyed so switching between addresses resets the form's defaults. */}
      <AddressForm key={editing?.id ?? "new"} districtsByProvince={districtsByProvince} address={editing} />
      {editing && (
        <p>
          <Link className="link-button" href="/hesap/adresler">
            Yeni adres ekle
          </Link>
        </p>
      )}
      <p>
        <Link className="link-button" href="/hesap">
          Hesabıma dön
        </Link>
      </p>
    </div>
  );
}
