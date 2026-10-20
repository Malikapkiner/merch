import { getOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * iyzico's merchant notification (webhook), set in the iyzico merchant panel
 * as https://<mağaza>/odeme/bildirim. It settles payments the Customer's
 * browser never came back from, and ones released from fraud review. The
 * body is only a hint: the result is fetched from iyzico by token, so the
 * notification's own signature need not be trusted, and a repeated
 * notification changes nothing.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const token = typeof body === "object" && body !== null && "token" in body ? body.token : undefined;
  // Events without a checkout form token aren't payments this store settles; acknowledge so iyzico stops retrying.
  if (typeof token !== "string" || token.length === 0) return new Response(null, { status: 200 });

  try {
    await getOrders().confirmPayment(token);
  } catch (error) {
    // A non-2xx answer makes iyzico retry the notification later.
    console.error("Payment notification could not be settled", error);
    return new Response(null, { status: 503 });
  }
  return new Response(null, { status: 200 });
}
