import { headers } from "next/headers";

/**
 * The public origin used in links we e-mail. SITE_URL is required in production: the Host
 * header is attacker-controlled, and a reset link built from it could point at another site.
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("SITE_URL is not set");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}
