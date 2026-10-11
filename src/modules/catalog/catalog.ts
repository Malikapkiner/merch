import { and, asc, eq, min } from "drizzle-orm";
import type { Database } from "@/db/client";
import { categories, products, variants } from "./schema";

export type Category = { id: number; slug: string; name: string };

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: Category | null;
  /** Lowest Variant price in kuruş (KDV included); null when the Product has no Variants. */
  fromPriceKurus: number | null;
};

export type Variant = {
  id: number;
  name: string;
  /** Price in kuruş, KDV included. */
  priceKurus: number;
  vatRatePercent: number;
  soldOut: boolean;
};

export type ProductDetail = Omit<Product, "fromPriceKurus"> & { variants: Variant[] };

export function createCatalog(db: Database) {
  return {
    async createCategory(input: { slug: string; name: string }): Promise<Category> {
      const [row] = await db.insert(categories).values(input).returning();
      return row;
    },
    async listCategories(): Promise<Category[]> {
      return db.select().from(categories).orderBy(asc(categories.id));
    },
    async createProduct(input: {
      slug: string;
      name: string;
      description?: string;
      categoryId?: number;
      published?: boolean;
    }): Promise<{ id: number; slug: string; name: string }> {
      const [row] = await db.insert(products).values(input).returning();
      return { id: row.id, slug: row.slug, name: row.name };
    },
    async addVariant(
      productId: number,
      input: { name: string; priceKurus: number; vatRatePercent: number; stock: number },
    ): Promise<void> {
      if (!Number.isInteger(input.priceKurus) || input.priceKurus < 0) {
        throw new Error("priceKurus must be a non-negative integer");
      }
      const existing = await db
        .select({ id: variants.id })
        .from(variants)
        .where(eq(variants.productId, productId));
      await db.insert(variants).values({ ...input, productId, position: existing.length });
    },
    /** A published Product with its Variants, or null if unknown or unpublished. */
    async getProduct(slug: string): Promise<ProductDetail | null> {
      const [row] = await db
        .select({
          id: products.id,
          slug: products.slug,
          name: products.name,
          description: products.description,
          category: { id: categories.id, slug: categories.slug, name: categories.name },
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.slug, slug), eq(products.published, true)));
      if (!row) return null;
      const variantRows = await db
        .select()
        .from(variants)
        .where(eq(variants.productId, row.id))
        .orderBy(asc(variants.position), asc(variants.id));
      return {
        ...row,
        category: row.category?.id === null ? null : row.category,
        variants: variantRows.map((v) => ({
          id: v.id,
          name: v.name,
          priceKurus: v.priceKurus,
          vatRatePercent: v.vatRatePercent,
          soldOut: v.stock <= 0,
        })),
      };
    },
    /** Published Products only, optionally limited to one category. */
    async listProducts(filter: { categorySlug?: string } = {}): Promise<Product[]> {
      const rows = await db
        .select({
          id: products.id,
          slug: products.slug,
          name: products.name,
          description: products.description,
          category: { id: categories.id, slug: categories.slug, name: categories.name },
          fromPriceKurus: min(variants.priceKurus),
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(variants, eq(variants.productId, products.id))
        .where(
          and(
            eq(products.published, true),
            filter.categorySlug ? eq(categories.slug, filter.categorySlug) : undefined,
          ),
        )
        .groupBy(products.id, categories.id)
        .orderBy(asc(products.id));
      return rows.map((row) => ({
        ...row,
        category: row.category?.id === null ? null : row.category,
      }));
    },
  };
}

export type Catalog = ReturnType<typeof createCatalog>;
