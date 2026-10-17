import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Admin } from "@/modules/accounts";
import { getAccounts } from "./accounts";

export const ADMIN_SESSION_COOKIE = "admin_session";

/** The Admin behind the current request's session cookie, or null. */
export async function getAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return getAccounts().verifySession(token);
}

/** Guards an Admin page or action; unauthenticated callers go to the login page. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/giris");
  return admin;
}
