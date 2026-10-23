import { and, asc, desc, eq, gte, inArray, min, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Database, Transaction } from "@/db/client";
import type { MediaStorage } from "../media";
import { pickDefaultVariant, type DefaultVariant } from "./default-variant";
import { categories, productImages, products, variants } from "./schema";

export type Category = { id: number; slug: string; name: string };

export type ProductImage = {
  id: number;
  /** Public URL of the image, built by the Media storage port. */
  url: string;
  position: number;
};

/** Why an image upload was rejected; thrown as a `ProductImageError` reason. */
export type ProductImageErrorReason = "unsupported-image-type" | "image-too-large";

export class ProductImageError extends Error {
  constructor(
    readonly reason: ProductImageErrorReason,
    message: string,
  ) {
    super(message);
  }
}

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: Category | null;
  /** Lowest Variant price in kuruş (KDV included); null when the Product has no Variants. */
  fromPriceKurus: number | null;
  /** Varsayılan Varyant: cheapest Variant in stock; null when sold out or without Variants. */
  defaultVariant: DefaultVariant | null;
  /** Cover image shown on the listing; the first image in the reorder. */
  coverImage: ProductImage | null;
};

export type Variant = {
  id: number;
  name: string;
  /** Price in kuruş, KDV included. */
  priceKurus: number;
  vatRatePercent: number;
  soldOut: boolean;
};

export type ProductDetail = Omit<Product, "fromPriceKurus" | "defaultVariant" | "coverImage"> & {
  /** All images of the Product in display order; the first one is the cover. */
  images: ProductImage[];
  variants: Variant[];
};

/** A Variant with its Product context, used to resolve a customer-held cart. */
export type VariantWithProduct = {
  id: number;
  name: string;
  productSlug: string;
  productName: string;
  /** Price in kuruş, KDV included. */
  priceKurus: number;
  vatRatePercent: number;
  stock: number;
};

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
  images: ProductImage[];
  variants: AdminVariant[];
};

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

/** Upload size limit for a single image; uploads above it are rejected. */
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageType = { contentType: string; extension: string };

/**
 * Identifies an uploaded image by its content (magic bytes), never by the
 * client-declared file name or content type.
 */
function sniffImageType(bytes: Uint8Array): ImageType | null {
  const startsWithPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const startsWithJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const startsWithWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (startsWithPng) return { contentType: "image/png", extension: "png" };
  if (startsWithJpeg) return { contentType: "image/jpeg", extension: "jpg" };
  if (startsWithWebp) return { contentType: "image/webp", extension: "webp" };
  return null;
}

/** Thrown by `decrementStock` when a Variant has fewer units than requested. */
export class InsufficientStockError extends Error {
  constructor(readonly variantId: number) {
    super(`Insufficient stock for variant ${variantId}`);
  }
}

/**
 * Takes sold units off Stok inside the caller's transaction. Each Variant is
 * decremented only while it still has enough units, so concurrent buyers of
 * the last unit can't both succeed; on a shortfall it throws
 * `InsufficientStockError` and the caller rolls the transaction back.
 */
export async function decrementStock(
  tx: Transaction,
  lines: ReadonlyArray<{ variantId: number; quantity: number }>,
): Promise<void> {
  // A fixed lock order keeps two multi-line Orders from deadlocking each other.
  const ordered = [...lines].sort((a, b) => a.variantId - b.variantId);
  for (const line of ordered) {
    const updated = await tx
      .update(variants)
      .set({ stock: sql`${variants.stock} - ${line.quantity}` })
      .where(and(eq(variants.id, line.variantId), gte(variants.stock, line.quantity)))
      .returning({ id: variants.id });
    if (updated.length === 0) throw new InsufficientStockError(line.variantId);
  }
}

type JoinedCategory = { id: number | null; slug: string | null; name: string | null } | null;

/** A left-joined category comes back all-null when absent; normalise it to Category | null. */
function toCategory(category: JoinedCategory): Category | null {
  return category && category.id !== null ? (category as Category) : null;
}

type ImageRow = { id: number; storageKey: string; position: number };

export type CatalogOptions = {
  /** Storage port used to upload and remove image objects and build their public URLs. */
  storage?: MediaStorage;
};

export function createCatalog(db: Database, options: CatalogOptions = {}) {
  const storage = options.storage;

  /** Images of a Product, cheapest to fetch with the common position/id order. */
  async function selectImages(productId: number): Promise<ImageRow[]> {
    return db
      .select({
        id: productImages.id,
        storageKey: productImages.storageKey,
        position: productImages.position,
      })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.position), asc(productImages.id));
  }

  /** Maps rows to public images; without a bound storage the images degrade to none. */
  function toImages(rows: ImageRow[]): ProductImage[] {
    if (!storage) return [];
    return rows.map((row) => ({ id: row.id, url: storage.publicUrl(row.storageKey), position: row.position }));
  }

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
    /**
     * Uploads one or more images for a Product with the Media storage port and
     * appends them at the end of the reorder. The type is validated from the
     * bytes of every file before anything is uploaded.
     */
    async addProductImages(
      productId: number,
      files: ReadonlyArray<Uint8Array>,
    ): Promise<void> {
      if (!storage) throw new Error("Image storage is not configured");
      /** Every file is validated and typed before anything is uploaded or counted. */
      const uploads = files.map((bytes) => {
        const type = sniffImageType(bytes);
        if (!type) throw new ProductImageError("unsupported-image-type", "Unsupported image type");
        if (bytes.length > MAX_PRODUCT_IMAGE_BYTES) {
          throw new ProductImageError(
            "image-too-large",
            `Image exceeds the ${MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)} MB limit`,
          );
        }
        return { key: `products/${productId}/${randomUUID()}.${type.extension}`, bytes, contentType: type.contentType };
      });
      const existing = await db
        .select({ id: productImages.id })
        .from(productImages)
        .where(eq(productImages.productId, productId));
      const storedKeys: string[] = [];
      try {
        for (const upload of uploads) {
          await storage.put({ key: upload.key, bytes: upload.bytes, contentType: upload.contentType });
          storedKeys.push(upload.key);
        }
      } catch (error) {
        // Best effort: don't leave already-stored objects orphaned in the bucket.
        await Promise.allSettled(storedKeys.map((key) => storage.delete(key)));
        throw error;
      }
      await db
        .insert(productImages)
        .values(
          uploads.map((upload, index) => ({ productId, storageKey: upload.key, position: existing.length + index })),
        );
    },
    /** Moves an image one step up or down in the reorder; edge moves are a no-op. */
    async moveProductImage(imageId: number, direction: "up" | "down"): Promise<void> {
      const [image] = await db
        .select({ id: productImages.id, productId: productImages.productId, position: productImages.position })
        .from(productImages)
        .where(eq(productImages.id, imageId));
      if (!image) throw new Error("Image not found");
      const siblings = await selectImages(image.productId);
      const index = siblings.findIndex((row) => row.id === imageId);
      const neighbourIndex = direction === "up" ? index - 1 : index + 1;
      if (neighbourIndex < 0 || neighbourIndex >= siblings.length) return;
      const neighbour = siblings[neighbourIndex];
      // One transaction keeps the two positions from ever collapsing into duplicates.
      await db.transaction(async (tx) => {
        await tx
          .update(productImages)
          .set({ position: neighbour.position })
          .where(eq(productImages.id, image.id));
        await tx
          .update(productImages)
          .set({ position: image.position })
          .where(eq(productImages.id, neighbour.id));
      });
    },
    /** Removes an image from the reorder and from storage; the rest keeps its order. */
    async deleteProductImage(imageId: number): Promise<void> {
      if (!storage) throw new Error("Image storage is not configured");
      const [image] = await db
        .select({ id: productImages.id, storageKey: productImages.storageKey })
        .from(productImages)
        .where(eq(productImages.id, imageId));
      if (!image) throw new Error("Image not found");
      await storage.delete(image.storageKey);
      await db.delete(productImages).where(eq(productImages.id, imageId));
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
        images: toImages(await selectImages(row.id)),
        variants: variantRows.map((v) => ({
          id: v.id,
          name: v.name,
          priceKurus: v.priceKurus,
          vatRatePercent: v.vatRatePercent,
          soldOut: v.stock <= 0,
        })),
      };
    },
    /** Variants by id with their Product context, for resolving a customer-held cart. */
    async getVariantsByIds(ids: number[]): Promise<VariantWithProduct[]> {
      if (ids.length === 0) return [];
      return db
        .select({
          id: variants.id,
          name: variants.name,
          productSlug: products.slug,
          productName: products.name,
          priceKurus: variants.priceKurus,
          vatRatePercent: variants.vatRatePercent,
          stock: variants.stock,
        })
        .from(variants)
        .innerJoin(products, eq(variants.productId, products.id))
        .where(and(inArray(variants.id, ids), eq(products.published, true)))
        .orderBy(asc(variants.id));
    },
    /** Published Products only, optionally limited to one category. */
    async listProducts(
      filter: { categorySlug?: string; newestFirst?: boolean; limit?: number } = {},
    ): Promise<Product[]> {
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
        .orderBy(...(filter.newestFirst ? [desc(products.createdAt), desc(products.id)] : [asc(products.id)]))
        .limit(filter.limit ?? 1000);
      const variantRows = rows.length
        ? await db
            .select({
              id: variants.id,
              productId: variants.productId,
              name: variants.name,
              priceKurus: variants.priceKurus,
              stock: variants.stock,
              position: variants.position,
            })
            .from(variants)
            .where(inArray(variants.productId, rows.map((row) => row.id)))
        : [];
      /** One extra ordered query; the first row per Product is the cover. */
      const imageRows = rows.length
        ? await db
            .select({
              id: productImages.id,
              productId: productImages.productId,
              storageKey: productImages.storageKey,
              position: productImages.position,
            })
            .from(productImages)
            .where(inArray(productImages.productId, rows.map((row) => row.id)))
            .orderBy(asc(productImages.position), asc(productImages.id))
        : [];
      const coverByProduct = new Map<number, ImageRow>();
      for (const row of imageRows) {
        if (!coverByProduct.has(row.productId)) coverByProduct.set(row.productId, row);
      }
      return rows.map((row) => ({
        ...row,
        category: toCategory(row.category),
        defaultVariant: pickDefaultVariant(variantRows.filter((v) => v.productId === row.id)),
        coverImage: toImages(coverByProduct.has(row.id) ? [coverByProduct.get(row.id) as ImageRow] : [])[0] ?? null,
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
          images: toImages(await selectImages(row.id)),
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
        images: toImages(await selectImages(id)),
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
