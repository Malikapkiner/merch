import { sql } from "drizzle-orm";
import { createDatabase } from "../src/db/client";

const DEFAULT_URL = "postgres://postgres:postgres@localhost:54329/merch_test";

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_URL;
  if (url.includes("neon.tech")) {
    throw new Error("Refusing to run tests against Neon; use a local/CI Postgres");
  }
  return url;
}

/** Real Postgres test database; call truncateAll() in beforeEach for isolation. */
export function openTestDatabase() {
  const { db, close } = createDatabase(testDatabaseUrl());
  async function truncateAll() {
    await db.execute(
      sql`TRUNCATE TABLE products, product_images, categories, admins, admin_sessions, members, member_sessions, password_reset_tokens, member_addresses, login_attempts, shipping_settings, orders, order_lines, order_lookup_attempts RESTART IDENTITY CASCADE`,
    );
  }
  return { db, close, truncateAll };
}
