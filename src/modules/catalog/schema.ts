import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  categoryId: integer("category_id").references(() => categories.id),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const variants = pgTable("variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** Price in kuruş, KDV included. */
  priceKurus: integer("price_kurus").notNull(),
  /** KDV rate in percent (e.g. 1 or 10), kept separately for invoicing. */
  vatRatePercent: integer("vat_rate_percent").notNull(),
  stock: integer("stock").notNull().default(0),
  position: integer("position").notNull().default(0),
});
