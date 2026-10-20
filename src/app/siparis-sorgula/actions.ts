"use server";

import { headers } from "next/headers";
import { getOrders } from "@/lib/orders";
import { requestFailureMessage } from "@/lib/order-status";
import { requestKindFor } from "@/modules/orders";
import type { OrderLine, OrderRequest, OrderRequestKind, OrderStatus } from "@/modules/orders";

/** What the lookup shows a Misafir; deliberately leaves out address, phone and tokens. */
export type LookupView = {
  orderNumber: string;
  status: OrderStatus;
  trackingNumber: string | null;
  lines: OrderLine[];
  totalKurus: number;
  /** The e-posta the Misafir proved ownership with; sent back with a request. */
  email: string;
  /** What a new request on this Order would be, or null when its status allows none. */
  requestKind: OrderRequestKind | null;
  /** False while an earlier request is still open. */
  canRequest: boolean;
  request: OrderRequest | null;
};

export type LookupState = { error: string | null; order: LookupView | null };

const NOT_FOUND = "Bu sipariş numarası ve e-posta ile eşleşen bir sipariş bulamadık. Bilgilerinizi kontrol edip tekrar deneyin.";
const RATE_LIMITED = "Çok fazla başarısız deneme yaptınız. Lütfen 15 dakika sonra tekrar deneyin.";

/**
 * The client as the reverse proxy reports it. The last x-forwarded-for hop is the one our proxy
 * appended; earlier hops are client-supplied and would let a guesser pick a fresh key per request.
 */
async function clientKey(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",").at(-1)?.trim() || headerList.get("x-real-ip") || "unknown";
}

export async function lookupOrderAction(_state: LookupState, formData: FormData): Promise<LookupState> {
  const result = await getOrders().lookupOrder({
    orderNumber: String(formData.get("orderNumber") ?? ""),
    email: String(formData.get("email") ?? ""),
    clientKey: await clientKey(),
  });
  if (!result.ok) return { error: result.reason === "rate-limited" ? RATE_LIMITED : NOT_FOUND, order: null };
  const { orderNumber, status, trackingNumber, lines, totalKurus } = result.order;
  const request = await getOrders().getRequest(orderNumber);
  return {
    error: null,
    order: {
      orderNumber,
      status,
      trackingNumber,
      lines,
      totalKurus,
      email: String(formData.get("email") ?? "").trim(),
      requestKind: requestKindFor(status),
      canRequest: requestKindFor(status) !== null && request?.status !== "open",
      request,
    },
  };
}

export type GuestRequestState = { error: string | null; request: OrderRequest | null };

/** A Misafir's İptal or İade request; the lookup is repeated first so guessing is rate limited. */
export async function requestGuestOrderChangeAction(
  _state: GuestRequestState,
  formData: FormData,
): Promise<GuestRequestState> {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const email = String(formData.get("email") ?? "");
  const lookup = await getOrders().lookupOrder({ orderNumber, email, clientKey: await clientKey() });
  if (!lookup.ok) return { error: lookup.reason === "rate-limited" ? RATE_LIMITED : NOT_FOUND, request: null };
  const result = await getOrders().submitRequest({
    orderNumber,
    reason: String(formData.get("reason") ?? ""),
    requester: { email },
  });
  if (!result.ok) return { error: requestFailureMessage(result.reason), request: null };
  return { error: null, request: result.request };
}
