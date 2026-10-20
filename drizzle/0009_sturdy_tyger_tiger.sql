CREATE TABLE "order_lookup_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_key" text NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "order_lookup_attempts_client_idx" ON "order_lookup_attempts" USING btree ("client_key");