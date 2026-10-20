import type { OrderRequestKind, OrderRequestStatus, OrderStatus, PaymentMethod, SubmitRequestResult } from "@/modules/orders";

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

/** İptal and İade requests as the Customer and the Admin read them. */
export const REQUEST_KIND_LABELS: Readonly<Record<OrderRequestKind, string>> = {
  cancellation: "İptal talebi",
  return: "İade talebi",
};

export const REQUEST_STATUS_LABELS: Readonly<Record<OrderRequestStatus, string>> = {
  open: "İnceleniyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

/** Why a request could not be made, in words for the Customer. */
export function requestFailureMessage(reason: Exclude<SubmitRequestResult, { ok: true }>["reason"]): string {
  switch (reason) {
    case "missing-reason":
      return "Lütfen talebinizin gerekçesini yazın.";
    case "already-open":
      return "Bu sipariş için zaten inceleme bekleyen bir talebiniz var.";
    case "not-eligible":
      return "Bu sipariş için artık talep oluşturulamaz.";
    case "not-found":
      return "Sipariş bulunamadı.";
  }
}
