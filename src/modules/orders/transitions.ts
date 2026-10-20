import type { OrderStatus } from "./types";

/**
 * Allowed Sipariş Durumu moves. The happy path runs Ödeme Bekliyor → Ödendi →
 * Hazırlanıyor → Kargoda → Teslim Edildi; an Order can be İptal until it
 * ships, and İade once it has shipped. İptal and İade are final.
 */
const NEXT_STATUSES: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  awaiting_payment: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUSES[from].includes(to);
}

/** Thrown when a status change skips a step or leaves a final status. */
export class OrderStatusError extends Error {
  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus,
  ) {
    super(`An Order cannot move from ${from} to ${to}`);
  }
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) throw new OrderStatusError(from, to);
}
