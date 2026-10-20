import type { OrderRequestKind, OrderStatus } from "./types";

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

/** The Sipariş Durumu values an Order can move to from `from`. */
export function nextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return NEXT_STATUSES[from];
}

/** Thrown when an Order is moved to Kargoda without a tracking number. */
export class MissingTrackingNumberError extends Error {
  constructor() {
    super("A tracking number is required to ship an Order");
  }
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) throw new OrderStatusError(from, to);
}

/**
 * The request a Customer can make on an Order in this Sipariş Durumu: İptal until it ships,
 * İade once it has shipped. Null when the Order is already İptal or İade.
 */
export function requestKindFor(status: OrderStatus): OrderRequestKind | null {
  if (status === "awaiting_payment" || status === "paid" || status === "preparing") return "cancellation";
  if (status === "shipped" || status === "delivered") return "return";
  return null;
}

/** Thrown when an Admin resolves an Order that has no open request. */
export class NoOpenRequestError extends Error {
  constructor() {
    super("The Order has no open request");
  }
}
