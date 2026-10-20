import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Member } from "@/modules/accounts";
import { getMembers } from "./members";

export const MEMBER_SESSION_COOKIE = "member_session";

/** The Member behind the current request's session cookie, or null. */
export async function getMember(): Promise<Member | null> {
  const token = (await cookies()).get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return getMembers().verifySession(token);
}

/** Guards a Member page or action; signed-out callers go to the login page. */
export async function requireMember(): Promise<Member> {
  const member = await getMember();
  if (!member) redirect("/hesap/giris");
  return member;
}
