CREATE TYPE "public"."order_status" AS ENUM('awaiting_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned');--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"variant_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"variant_name" text NOT NULL,
	"unit_price_kurus" integer NOT NULL,
	"vat_rate_percent" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_kurus" integer NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"access_token" text NOT NULL,
	"status" "order_status" DEFAULT 'awaiting_payment' NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"billing" jsonb NOT NULL,
	"accepted_documents" jsonb NOT NULL,
	"subtotal_kurus" integer NOT NULL,
	"shipping_fee_kurus" integer NOT NULL,
	"total_kurus" integer NOT NULL,
	"payment_token" text,
	"payment_id" text,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_access_token_unique" UNIQUE("access_token"),
	CONSTRAINT "orders_payment_token_unique" UNIQUE("payment_token")
);
--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;