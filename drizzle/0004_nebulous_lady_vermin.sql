CREATE TABLE "shipping_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"shipping_fee_kurus" integer NOT NULL,
	"free_shipping_threshold_kurus" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
