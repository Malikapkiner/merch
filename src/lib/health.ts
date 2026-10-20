import { sql } from "drizzle-orm";
import type { Database } from "@/db";

/** Whether the app can serve orders: the database must answer. The cause is logged, never returned to the caller. */
export async function checkHealth(db: Pick<Database, "execute">): Promise<{ ok: boolean }> {
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (error) {
    console.error("health check failed", error instanceof Error ? error.message : error);
    return { ok: false };
  }
}
