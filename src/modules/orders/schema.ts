import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type {
  Address,
  BillingInfo,
  CancellationReason,
  OrderRequestKind,
  OrderRequestStatus,
  OrderStatus,
  PaymentMethod,
} from "./types";

export const orderStatus = pgEnum("order_status", [
  "awaiting_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const satisfies readonly OrderStatus[]);

export const paymentMethod = pgEnum("payment_method", ["card", "bank_transfer"] as const satisfies readonly PaymentMethod[]);

/**
 * An Order with a snapshot of everything the Customer agreed to: addresses,
 * billing info, totals and the accepted legal document versions. Later edits
 * to Products, prices or documents never change a placed Order.
 */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  /** Human-facing Sipariş numarası, shown to the Customer and the Admin. */
  orderNumber: text("order_number").notNull().unique(),
  /** Unguessable token in the confirmation page link. */
  accessToken: text("access_token").notNull().unique(),
  status: orderStatus("status").notNull().default("awaiting_payment"),
  paymentMethod: paymentMethod("payment_method").notNull().default("card"),
  /** The Member who placed the Order; null for a Misafir. Not a foreign key: Orders outlive accounts. */
  memberId: integer("member_id"),
  email: text("email").notNull(),
  /** E.164, e.g. +905321234567. */
  phone: text("phone").notNull(),
  shippingAddress: jsonb("shipping_address").$type<Address>().notNull(),
  billing: jsonb("billing").$type<BillingInfo>().notNull(),
  /** Legal document slug -> version accepted at checkout. */
  acceptedDocuments: jsonb("accepted_documents").$type<Record<string, string>>().notNull(),
  subtotalKurus: integer("subtotal_kurus").notNull(),
  shippingFeeKurus: integer("shipping_fee_kurus").notNull(),
  totalKurus: integer("total_kurus").notNull(),
  /** The payment provider's token for this Order's payment attempt. */
  paymentToken: text("payment_token").unique(),
  /** The provider's id of the captured payment, set once paid. */
  paymentId: text("payment_id"),
  cancellationReason: text("cancellation_reason").$type<CancellationReason>(),
  /** Kargo takip numarası the Admin entered when the Order went Kargoda. */
  trackingNumber: text("tracking_number"),
  /** The Admin's note on an İptal or İade, e.g. that the refund was made in the provider's panel. */
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

/** Order lines copy the Product/Variant names, price and KDV rate at purchase time. */
export const orderLines = pgTable("order_lines", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  /** Not a foreign key: the line must outlive Catalog changes. */
  variantId: integer("variant_id").notNull(),
  productName: text("product_name").notNull(),
  variantName: text("variant_name").notNull(),
  /** Unit price in kuruş, KDV included. */
  unitPriceKurus: integer("unit_price_kurus").notNull(),
  vatRatePercent: integer("vat_rate_percent").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotalKurus: integer("line_total_kurus").notNull(),
  position: integer("position").notNull(),
});

/** Failed Misafir Order lookups, used to rate limit guessing per client. */
export const orderLookupAttempts = pgTable(
  "order_lookup_attempts",
  {
    id: serial("id").primaryKey(),
    clientKey: text("client_key").notNull(),
    attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
  },
  (table) => [index("order_lookup_attempts_client_idx").on(table.clientKey)],
);

/** A Customer's İptal or İade request on an Order; at most one is open per Order. */
export const orderRequests = pgTable(
  "order_requests",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: text("kind").$type<OrderRequestKind>().notNull(),
    reason: text("reason").notNull(),
    status: text("status").$type<OrderRequestStatus>().notNull().default("open"),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("order_requests_order_idx").on(table.orderId),
    uniqueIndex("order_requests_one_open_idx").on(table.orderId).where(sql`${table.status} = 'open'`),
  ],
);
