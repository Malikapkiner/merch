"use server";

import { headers } from "next/headers";
import { getOrders } from "@/lib/orders";
import type { OrderLine, OrderStatus } from "@/modules/orders";

/** What the lookup shows a Misafir; deliberately leaves out address, phone and tokens. */
export type LookupView = {
  orderNumber: string;
  status: OrderStatus;
  trackingNumber: string | null;
  lines: OrderLine[];
  totalKurus: number;
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
  return { error: null, order: { orderNumber, status, trackingNumber, lines, totalKurus } };
}
