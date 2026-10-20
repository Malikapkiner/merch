import type { NextRequest } from "next/server";
import { fakePaymentProvider } from "@/lib/payments";

export const dynamic = "force-dynamic";

/** Settles a payment on the fake provider's page and returns to the callback, as a real provider would. */
export async function POST(request: NextRequest) {
  const fake = fakePaymentProvider();
  if (!fake) return new Response(null, { status: 404 });
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const session = fake.session(token);
  if (!session) return Response.redirect(new URL("/odeme?hata=odeme-basarisiz", request.url), 303);

  if (form.get("outcome") === "approve") fake.approve(token);
  else fake.decline(token);
  return Response.redirect(`${session.callbackUrl}?token=${encodeURIComponent(token)}`, 303);
}
