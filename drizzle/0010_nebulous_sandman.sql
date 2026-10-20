CREATE TABLE "order_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"kind" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_requests_order_idx" ON "order_requests" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_requests_one_open_idx" ON "order_requests" USING btree ("order_id") WHERE "order_requests"."status" = 'open';