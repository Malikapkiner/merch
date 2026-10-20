import type { CartItem } from "../cart";

/**
 * Sipariş Durumu: Ödeme Bekliyor → Ödendi → Hazırlanıyor → Kargoda → Teslim
 * Edildi, plus İptal and İade.
 */
export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

/** Why an Order became İptal before it was paid. */
export type CancellationReason = "payment-failed" | "out-of-stock";

/** A delivery address; il and ilçe come from the Address module lists. */
export type Address = {
  fullName: string;
  province: string;
  district: string;
  neighbourhood: string;
  addressLine: string;
};

/** Invoice details; `name` may be a person or a company, and defaults to the recipient when left empty. */
export type BillingInfo = {
  name: string;
  province: string;
  district: string;
  neighbourhood: string;
  addressLine: string;
  /** VKN (10 digits) or TCKN (11 digits); null when not given. */
  taxNumber: string | null;
};

export type CheckoutInput = {
  items: CartItem[];
  email: string;
  phone: string;
  shippingAddress: Address;
  billing: BillingInfo;
  /** The Customer ticked the Mesafeli Satış Sözleşmesi and Ön Bilgilendirme Formu box. */
  acceptedContracts: boolean;
};

/** Checkout fields that can fail validation, named as in the checkout form. */
export type CheckoutField =
  | "email"
  | "phone"
  | "fullName"
  | "province"
  | "district"
  | "neighbourhood"
  | "addressLine"
  | "billingName"
  | "billingProvince"
  | "billingDistrict"
  | "billingNeighbourhood"
  | "billingAddressLine"
  | "taxNumber";

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; paymentUrl: string }
  | { ok: false; reason: "contracts-not-accepted" }
  | { ok: false; reason: "invalid-details"; fields: CheckoutField[] }
  | { ok: false; reason: "empty-cart" }
  /** A Variant is gone or has less Stok than the cart asks for; the cart page shows which. */
  | { ok: false; reason: "cart-changed" };

export type OrderLine = {
  variantId: number;
  productName: string;
  variantName: string;
  unitPriceKurus: number;
  vatRatePercent: number;
  quantity: number;
  lineTotalKurus: number;
};

export type Order = {
  orderNumber: string;
  accessToken: string;
  status: OrderStatus;
  email: string;
  phone: string;
  shippingAddress: Address;
  billing: BillingInfo;
  lines: OrderLine[];
  subtotalKurus: number;
  shippingFeeKurus: number;
  totalKurus: number;
  acceptedDocuments: Record<string, string>;
  cancellationReason: CancellationReason | null;
  createdAt: Date;
  paidAt: Date | null;
};

export type ConfirmPaymentResult =
  | { ok: true; order: Order }
  /** The payment is declined, the Order was already cancelled, or the token is unknown; Stok is untouched. */
  | { ok: false; reason: "payment-failed" }
  /** The provider hasn't settled the payment yet (e.g. a fraud review); the Order stays Ödeme Bekliyor. */
  | { ok: false; reason: "payment-pending" }
  /** Paid, but a Variant sold out first; the payment is cancelled and the Order is İptal. */
  | { ok: false; reason: "out-of-stock" };
