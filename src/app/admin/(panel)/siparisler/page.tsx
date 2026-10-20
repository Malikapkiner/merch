import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { formatPrice } from "@/lib/format-price";
import { getOrders } from "@/lib/orders";
import { isOrderStatus, ORDER_STATUS_LABELS, REQUEST_KIND_LABELS } from "@/lib/order-status";
import type { OrderStatus } from "@/modules/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Siparişler" };

type Props = { searchParams: Promise<{ durum?: string }> };

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" });

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireAdmin();
  const { durum } = await searchParams;
  const status = durum && isOrderStatus(durum) ? durum : undefined;
  const [orders, requests] = await Promise.all([getOrders().listOrders({ status }), getOrders().listOpenRequests()]);

  return (
    <div>
      <h1 className="heading-section">Siparişler</h1>

      {requests.length > 0 && (
        <section className="admin-card">
          <h2>Bekleyen talepler</h2>
          <ul>
            {requests.map((request) => (
              <li key={request.orderNumber}>
                <Link href={`/admin/siparisler/${request.orderNumber}`}>{request.orderNumber}</Link> ·{" "}
                {REQUEST_KIND_LABELS[request.kind]} · {request.customerName} · {dateFormatter.format(request.createdAt)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="admin-nav" aria-label="Sipariş durumları">
        <Link href="/admin/siparisler" aria-current={status ? undefined : "page"}>
          Tümü
        </Link>
        {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((value) => (
          <Link
            key={value}
            href={`/admin/siparisler?durum=${value}`}
            aria-current={status === value ? "page" : undefined}
          >
            {ORDER_STATUS_LABELS[value]}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p>Bu durumda sipariş yok.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Sipariş no</th>
              <th scope="col">Tarih</th>
              <th scope="col">Müşteri</th>
              <th scope="col">Durum</th>
              <th scope="col">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderNumber}>
                <td>
                  <Link href={`/admin/siparisler/${order.orderNumber}`}>{order.orderNumber}</Link>
                </td>
                <td>{dateFormatter.format(order.createdAt)}</td>
                <td>
                  {order.customerName}
                  <br />
                  <span className="muted">{order.email}</span>
                </td>
                <td>{ORDER_STATUS_LABELS[order.status]}</td>
                <td>{formatPrice(order.totalKurus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
