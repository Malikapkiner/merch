import type { OrderStatus, PaymentMethod } from "@/modules/orders";

/** Sipariş Durumu as the Admin reads it. */
export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  awaiting_payment: "Ödeme Bekliyor",
  paid: "Ödendi",
  preparing: "Hazırlanıyor",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
  returned: "İade",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return Object.hasOwn(ORDER_STATUS_LABELS, value);
}

/** Payment method as the Admin reads it. */
export const PAYMENT_METHOD_LABELS: Readonly<Record<PaymentMethod, string>> = {
  card: "Kart",
  bank_transfer: "Havale/EFT",
};
