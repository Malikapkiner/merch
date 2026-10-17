import type { Metadata } from "next";
import { AdminStatus } from "@/components/admin-status";
import { requireAdmin } from "@/lib/admin-session";
import { getCatalog } from "@/lib/catalog";
import { createProductAction } from "../../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Yeni ürün" };

type Props = { searchParams: Promise<{ hata?: string }> };

export default async function NewProductPage({ searchParams }: Props) {
  await requireAdmin();
  const [{ hata: error }, categories] = await Promise.all([searchParams, getCatalog().listCategories()]);

  return (
    <div className="narrow">
      <h1 className="heading-section">Yeni ürün</h1>
      <AdminStatus error={error} />
      <form action={createProductAction} className="admin-form">
        <div className="field">
          <label htmlFor="name">Ürün adı</label>
          <input id="name" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="slug">Kısa ad (URL)</label>
          <input id="slug" name="slug" required pattern="[a-z0-9-]+" />
        </div>
        <div className="field">
          <label htmlFor="description">Açıklama</label>
          <textarea id="description" name="description" rows={4} />
        </div>
        <div className="field">
          <label htmlFor="categoryId">Kategori</label>
          <select id="categoryId" name="categoryId" defaultValue="">
            <option value="">Kategori yok</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <button className="button" type="submit">
          Oluştur
        </button>
      </form>
    </div>
  );
}
