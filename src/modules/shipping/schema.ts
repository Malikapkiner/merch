import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";

/**
 * Shipping configuration: a single row (id = 1) holding the flat fee and the
 * free shipping threshold. Editing it from the Admin panel takes effect on the
 * next read, with no deploy.
 */
export const shippingSettings = pgTable("shipping_settings", {
  id: integer("id").primaryKey(),
  /** Flat shipping fee in kuruş (Kargo Ücreti), charged below the free shipping threshold. */
  shippingFeeKurus: integer("shipping_fee_kurus").notNull(),
  /** Subtotal in kuruş at or above which shipping is free. */
  freeShippingThresholdKurus: integer("free_shipping_threshold_kurus").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
