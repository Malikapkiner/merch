import type { NextRequest } from "next/server";
import { getOrders } from "@/lib/orders";
import type { ConfirmPaymentResult } from "@/modules/orders";

export const dynamic = "force-dynamic";

/** The cart page's `hata` value for each way a payment can end without a confirmed Order. */
const FAILURE_CODES: Record<Exclude<ConfirmPaymentResult, { ok: true }>["reason"], string> = {
  "payment-failed": "odeme-basarisiz",
  "payment-pending": "odeme-bekliyor",
  "out-of-stock": "stok-tukendi",
};

async function confirm(token: string): Promise<ConfirmPaymentResult> {
  try {
    return await getOrders().confirmPayment(token);
  } catch (error) {
    // The provider couldn't be asked; the Order stays open for the provider's notification to settle it.
    // Errors carry the provider's error code only, never card data.
    console.error("Payment confirmation failed", error);
    return { ok: false, reason: "payment-pending" };
  }
}

/**
 * Where the Customer lands after the provider's page; the result is verified
 * with the provider, not trusted from here. A payment that didn't go through
 * returns the Customer to their cart with a message.
 */
async function settle(request: NextRequest, token: string | null): Promise<Response> {
  const result = token ? await confirm(token) : ({ ok: false, reason: "payment-failed" } as const);
  const path = result.ok
    ? `/siparis/onay/${result.order.accessToken}?yeni=1`
    : `/sepet?hata=${FAILURE_CODES[result.reason]}`;
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
