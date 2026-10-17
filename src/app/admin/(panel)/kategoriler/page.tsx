import type { Metadata } from "next";
import { AdminStatus } from "@/components/admin-status";
import { requireAdmin } from "@/lib/admin-session";
import { getCatalog } from "@/lib/catalog";
import { createCategoryAction } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kategoriler" };

type Props = { searchParams: Promise<{ hata?: string; durum?: string }> };

export default async function AdminCategoriesPage({ searchParams }: Props) {
  await requireAdmin();
  const [categories, { hata: error, durum: saved }] = await Promise.all([getCatalog().listCategories(), searchParams]);

  return (
    <div>
      <h1 className="heading-section">Kategoriler</h1>
      <AdminStatus error={error} saved={saved} />

      <section className="admin-card">
        {categories.length === 0 ? (
          <p>Henüz kategori eklenmemiş.</p>
        ) : (
          <ul className="category-list">
            {categories.map((category) => (
              <li key={category.id}>
                {category.name} <span className="muted">({category.slug})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card">
        <h2>Yeni kategori</h2>
        <form action={createCategoryAction} className="admin-form admin-form--inline">
          <div className="field">
            <label htmlFor="category-name">Ad</label>
            <input id="category-name" name="name" placeholder="Zeytinyağı" required />
          </div>
          <div className="field">
            <label htmlFor="category-slug">Kısa ad (URL)</label>
            <input id="category-slug" name="slug" placeholder="zeytinyagi" required pattern="[a-z0-9-]+" />
          </div>
          <button className="button" type="submit">
            Ekle
          </button>
        </form>
      </section>
    </div>
  );
}
