import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { getCatalog } from "@/lib/catalog";
import { setProductPublishedAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ürünler" };

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await getCatalog().listProductsForAdmin();

  return (
    <div>
      <div className="admin-title-row">
        <h1 className="heading-section">Ürünler</h1>
        <Link className="button" href="/admin/urunler/yeni">
          Yeni ürün
        </Link>
      </div>

      {products.length === 0 ? (
        <p>Henüz ürün eklenmemiş.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Ürün</th>
              <th scope="col">Kısa ad</th>
              <th scope="col">Kategori</th>
              <th scope="col">Durum</th>
              <th scope="col">Varyant</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <Link href={`/admin/urunler/${product.id}`}>{product.name}</Link>
                </td>
                <td>{product.slug}</td>
                <td>{product.category?.name ?? "—"}</td>
                <td>{product.published ? "Yayında" : "Taslak"}</td>
                <td>{product.variants.length}</td>
                <td>
                  <form action={setProductPublishedAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="published" value={product.published ? "false" : "true"} />
                    <button className="link-button" type="submit">
                      {product.published ? "Yayından kaldır" : "Yayınla"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
