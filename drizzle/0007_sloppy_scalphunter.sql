CREATE TYPE "public"."payment_method" AS ENUM('card', 'bank_transfer');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" "payment_method" DEFAULT 'card' NOT NULL;