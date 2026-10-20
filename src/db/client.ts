import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type Database = ReturnType<typeof createDatabase>["db"];

/** The handle a `db.transaction` callback receives; modules accept it to join a caller's transaction. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function createDatabase(connectionString: string) {
  const pool = new Pool({ connectionString });
  return { db: drizzle(pool), close: () => pool.end() };
}
