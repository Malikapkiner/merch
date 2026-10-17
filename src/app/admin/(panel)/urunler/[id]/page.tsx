import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminStatus } from "@/components/admin-status";
import { requireAdmin } from "@/lib/admin-session";
import { getCatalog } from "@/lib/catalog";
import { formatPriceInput } from "@/lib/price-input";
import { addVariantAction, setStockAction, updateProductAction, updateVariantAction } from "../../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ürünü düzenle" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string; durum?: string }>;
};

export default async function EditProductPage({ params, searchParams }: Props) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [product, categories, { hata: error, durum: saved }] = await Promise.all([
    getCatalog().getProductForAdmin(id),
    getCatalog().listCategories(),
    searchParams,
  ]);
  if (!product) notFound();

  return (
    <div>
      <p className="breadcrumb">
        <Link href="/admin">Ürünler</Link>
      </p>
      <div className="admin-title-row">
        <h1 className="heading-section">{product.name}</h1>
        <Link className="link-button" href={`/urunler/${product.slug}`}>
          Mağazada gör
        </Link>
      </div>
      <AdminStatus error={error} saved={saved} />

      <section className="admin-card">
        <h2>Ürün bilgileri</h2>
        <form action={updateProductAction} className="admin-form">
          <input type="hidden" name="productId" value={product.id} />
          <div className="field">
            <label htmlFor="name">Ürün adı</label>
            <input id="name" name="name" defaultValue={product.name} required />
          </div>
          <div className="field">
            <label htmlFor="slug">Kısa ad (URL)</label>
            <input id="slug" name="slug" defaultValue={product.slug} required pattern="[a-z0-9-]+" />
          </div>
          <div className="field">
            <label htmlFor="description">Açıklama</label>
            <textarea id="description" name="description" rows={4} defaultValue={product.description} />
          </div>
          <div className="field">
            <label htmlFor="categoryId">Kategori</label>
            <select id="categoryId" name="categoryId" defaultValue={product.category?.id ?? ""}>
              <option value="">Kategori yok</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <label className="checkbox-field">
            <input type="checkbox" name="published" defaultChecked={product.published} />
            Yayında
          </label>
          <button className="button" type="submit">
            Kaydet
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Varyantlar</h2>
        {product.variants.length === 0 ? (
          <p>Bu ürünün henüz varyantı yok.</p>
        ) : (
          <ul className="variant-list">
            {product.variants.map((variant) => (
              <li key={variant.id} className="variant-row">
                <form action={updateVariantAction} className="admin-form admin-form--inline">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="variantId" value={variant.id} />
                  <div className="field">
                    <label htmlFor={`name-${variant.id}`}>Ad</label>
                    <input id={`name-${variant.id}`} name="name" defaultValue={variant.name} required />
                  </div>
                  <div className="field">
                    <label htmlFor={`price-${variant.id}`}>Fiyat (₺, KDV dahil)</label>
                    <input
                      id={`price-${variant.id}`}
                      name="price"
                      defaultValue={formatPriceInput(variant.priceKurus)}
                      inputMode="decimal"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`vat-${variant.id}`}>KDV oranı (%)</label>
                    <input
                      id={`vat-${variant.id}`}
                      name="vatRatePercent"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={variant.vatRatePercent}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`stock-${variant.id}`}>Stok</label>
                    <input
                      id={`stock-${variant.id}`}
                      name="stock"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={variant.stock}
                      required
                    />
                  </div>
                  <button className="button" type="submit">
                    Kaydet
                  </button>
                </form>
                <form action={setStockAction} className="admin-form admin-form--inline stock-form">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="variantId" value={variant.id} />
                  <div className="field">
                    <label htmlFor={`stock-only-${variant.id}`}>Stok düzelt</label>
                    <input
                      id={`stock-only-${variant.id}`}
                      name="stock"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={variant.stock}
                      required
                    />
                  </div>
                  <button className="link-button" type="submit">
                    Stok düzelt
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card">
        <h2>Yeni varyant ekle</h2>
        <form action={addVariantAction} className="admin-form admin-form--inline">
          <input type="hidden" name="productId" value={product.id} />
          <div className="field">
            <label htmlFor="new-name">Ad</label>
            <input id="new-name" name="name" placeholder="500 ml cam şişe" required />
          </div>
          <div className="field">
            <label htmlFor="new-price">Fiyat (₺, KDV dahil)</label>
            <input id="new-price" name="price" inputMode="decimal" placeholder="349.50" required />
          </div>
          <div className="field">
            <label htmlFor="new-vat">KDV oranı (%)</label>
            <input id="new-vat" name="vatRatePercent" type="number" min="0" step="1" defaultValue={10} required />
          </div>
          <div className="field">
            <label htmlFor="new-stock">Stok</label>
            <input id="new-stock" name="stock" type="number" min="0" step="1" defaultValue={0} required />
          </div>
          <button className="button" type="submit">
            Ekle
          </button>
        </form>
      </section>
    </div>
  );
}
