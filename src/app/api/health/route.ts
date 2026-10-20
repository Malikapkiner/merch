import { getDb } from "@/db";
import { checkHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

/** Liveness and database check for the Docker healthcheck and the uptime monitor. */
export async function GET() {
  const { ok } = await checkHealth(getDb());
  return Response.json({ status: ok ? "ok" : "unavailable" }, { status: ok ? 200 : 503 });
}
