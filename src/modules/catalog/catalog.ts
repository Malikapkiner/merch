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

/** A Variant as the Admin edits it: raw Stok and KDV, no "Tükendi" projection. */
export type AdminVariant = {
  id: number;
  name: string;
  /** Price in kuruş, KDV included. */
  priceKurus: number;
  vatRatePercent: number;
  stock: number;
  position: number;
};

/** A Product as the Admin edits it, including unpublished ones. */
export type AdminProduct = {
  id: number;
  slug: string;
  name: string;
  description: string;
  published: boolean;
  category: Category | null;
  variants: AdminVariant[];
};

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

type JoinedCategory = { id: number | null; slug: string | null; name: string | null } | null;

/** A left-joined category comes back all-null when absent; normalise it to Category | null. */
function toCategory(category: JoinedCategory): Category | null {
  return category && category.id !== null ? (category as Category) : null;
}

export function createCatalog(db: Database) {
  async function selectAdminVariants(productId: number): Promise<AdminVariant[]> {
    return db
      .select({
        id: variants.id,
        name: variants.name,
        priceKurus: variants.priceKurus,
        vatRatePercent: variants.vatRatePercent,
        stock: variants.stock,
        position: variants.position,
      })
      .from(variants)
      .where(eq(variants.productId, productId))
      .orderBy(asc(variants.position), asc(variants.id));
  }

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
      assertNonNegativeInteger(input.priceKurus, "priceKurus");
      assertNonNegativeInteger(input.vatRatePercent, "vatRatePercent");
      assertNonNegativeInteger(input.stock, "stock");
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
        category: toCategory(row.category),
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
        category: toCategory(row.category),
      }));
    },
    /** Every Product, published or not, with its raw Variants; for the Admin panel. */
    async listProductsForAdmin(): Promise<AdminProduct[]> {
      const rows = await db
        .select({
          id: products.id,
          slug: products.slug,
          name: products.name,
          description: products.description,
          published: products.published,
          category: { id: categories.id, slug: categories.slug, name: categories.name },
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .orderBy(asc(products.id));
      return Promise.all(
        rows.map(async (row) => ({
          ...row,
          category: toCategory(row.category),
          variants: await selectAdminVariants(row.id),
        })),
      );
    },
    /** A Product for editing, including unpublished, or null if unknown. */
    async getProductForAdmin(id: number): Promise<AdminProduct | null> {
      const [row] = await db
        .select({
          id: products.id,
          slug: products.slug,
          name: products.name,
          description: products.description,
          published: products.published,
          category: { id: categories.id, slug: categories.slug, name: categories.name },
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.id, id));
      if (!row) return null;
      return {
        ...row,
        category: toCategory(row.category),
        variants: await selectAdminVariants(id),
      };
    },
    /** Edits a Product; publishing and unpublishing go through `published`. */
    async updateProduct(
      id: number,
      input: {
        slug?: string;
        name?: string;
        description?: string;
        categoryId?: number | null;
        published?: boolean;
      },
    ): Promise<void> {
      const changes = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
      if (Object.keys(changes).length === 0) return;
      await db.update(products).set(changes).where(eq(products.id, id));
    },
    /** Edits a Variant's name, price, KDV rate or Stok. */
    async updateVariant(
      id: number,
      input: { name?: string; priceKurus?: number; vatRatePercent?: number; stock?: number },
    ): Promise<void> {
      if (input.priceKurus !== undefined) assertNonNegativeInteger(input.priceKurus, "priceKurus");
      if (input.vatRatePercent !== undefined) assertNonNegativeInteger(input.vatRatePercent, "vatRatePercent");
      if (input.stock !== undefined) assertNonNegativeInteger(input.stock, "stock");
      const changes = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
      if (Object.keys(changes).length === 0) return;
      await db.update(variants).set(changes).where(eq(variants.id, id));
    },
    /** Manual Stok correction by the Admin. */
    async setStock(id: number, stock: number): Promise<void> {
      assertNonNegativeInteger(stock, "stock");
      await db.update(variants).set({ stock }).where(eq(variants.id, id));
    },
  };
}

export type Catalog = ReturnType<typeof createCatalog>;
