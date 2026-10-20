import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice } from "@/lib/format-price";
import { requireMember } from "@/lib/member-session";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { getOrders } from "@/lib/orders";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Hesabım", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" });

export default async function AccountPage() {
  const member = await requireMember();
  const history = await getOrders().listOrdersForMember(member.id);

  return (
    <div className="container section narrow">
      <p className="eyebrow">{member.email}</p>
      <h1 className="heading-section">Hesabım</h1>
      <p>
        <Link className="link-button" href="/hesap/adresler">
          Adreslerim
        </Link>
      </p>

      <h2>Siparişlerim</h2>
      {history.length === 0 ? (
        <p>
          Henüz siparişiniz yok. <Link className="link-button" href="/urunler">Ürünlere göz atın</Link>.
        </p>
      ) : (
        <ul className="checkout__lines">
          {history.map((order) => (
            <li key={order.orderNumber}>
              <span>
                <Link className="link-button" href={`/hesap/siparisler/${order.orderNumber}`}>
                  {order.orderNumber}
                </Link>{" "}
                · {dateFormat.format(order.createdAt)} · {ORDER_STATUS_LABELS[order.status]}
              </span>
              <span>{formatPrice(order.totalKurus)}</span>
            </li>
          ))}
        </ul>
      )}

      <form action={logoutAction}>
        <button className="button" type="submit">
          Çıkış yap
        </button>
      </form>
    </div>
  );
}
