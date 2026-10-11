import { asc } from "drizzle-orm";
import type { Database } from "@/db/client";
import { products } from "./schema";

export type Product = { id: number; slug: string; name: string };

export function createCatalog(db: Database) {
  return {
    async createProduct(input: { slug: string; name: string }): Promise<Product> {
      const [row] = await db.insert(products).values(input).returning();
      return { id: row.id, slug: row.slug, name: row.name };
    },
    async listProducts(): Promise<Product[]> {
      const rows = await db.select().from(products).orderBy(asc(products.id));
      return rows.map(({ id, slug, name }) => ({ id, slug, name }));
    },
  };
}

export type Catalog = ReturnType<typeof createCatalog>;
