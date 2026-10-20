import type { NextRequest } from "next/server";
import { getOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Where the Customer lands after the provider's page; the result is verified with the provider, not trusted from here. */
async function settle(request: NextRequest, token: string | null): Promise<Response> {
  const result = token ? await getOrders().confirmPayment(token) : ({ ok: false, reason: "payment-failed" } as const);
  const path = result.ok
    ? `/siparis/onay/${result.order.accessToken}?yeni=1`
    : `/odeme?hata=${result.reason === "out-of-stock" ? "stok-tukendi" : "odeme-basarisiz"}`;
  // 303 turns the provider's POST into a GET of the result page.
  return Response.redirect(new URL(path, request.url), 303);
}

export async function GET(request: NextRequest) {
  return settle(request, request.nextUrl.searchParams.get("token"));
}

/** Providers such as iyzico post the token as a form field. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  return settle(request, typeof token === "string" ? token : request.nextUrl.searchParams.get("token"));
}
