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

/** How the Customer pays: by card through the provider, or by havale/EFT confirmed by the Admin. */
export type PaymentMethod = "card" | "bank_transfer";

/** Where a Havale Siparişi is paid to; shown at checkout and in the Customer's e-mail. */
export type BankAccount = { bankName: string; accountHolder: string; iban: string };

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
  /** The signed-in Member placing the Order; omitted for a Misafir. */
  memberId?: number;
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

export type PlaceBankTransferOrderResult =
  | { ok: true; orderNumber: string; accessToken: string }
  | Exclude<PlaceOrderResult, { ok: true }>;

export type OrderLine = {
  variantId: number;
  productName: string;
  variantName: string;
  unitPriceKurus: number;
  vatRatePercent: number;
  quantity: number;
  lineTotalKurus: number;
};

/** One row of the Admin's Order list. */
export type OrderSummary = {
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  email: string;
  totalKurus: number;
  createdAt: Date;
};

export type Order = {
  orderNumber: string;
  accessToken: string;
  /** The Member who placed the Order; null for a Misafir. */
  memberId: number | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
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
  trackingNumber: string | null;
  /** The Admin's note on an İptal or İade; internal, never shown to the Customer. */
  adminNote: string | null;
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

export type ConfirmBankTransferResult =
  | { ok: true; order: Order }
  /** A Variant has less Stok than the Order needs; the Order stays Ödeme Bekliyor and Stok is untouched. */
  | { ok: false; reason: "insufficient-stock"; variantName: string };

export type LookupOrderInput = {
  orderNumber: string;
  email: string;
  /** Who is asking (the client address); failed lookups are counted per client. */
  clientKey: string;
};

export type LookupOrderResult =
  | { ok: true; order: Order }
  /** No Order has this number and e-posta; deliberately the same answer whether or not the number exists. */
  | { ok: false; reason: "not-found" }
  /** Too many failed lookups from this client; try again later. */
  | { ok: false; reason: "rate-limited" };

/**
 * What a Customer asks for: İptal of an Order that hasn't been delivered, or İade of one
 * that has shipped. The kind follows from the Sipariş Durumu when the request is made.
 */
export type OrderRequestKind = "cancellation" | "return";

export type OrderRequestStatus = "open" | "approved" | "rejected";

export type OrderRequest = {
  orderNumber: string;
  kind: OrderRequestKind;
  /** The Customer's gerekçe. */
  reason: string;
  status: OrderRequestStatus;
  /** The Admin's note when the request was approved or rejected; internal, never shown to the Customer. */
  resolutionNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};

/** One row of the Admin's open request list. */
export type OpenOrderRequest = OrderRequest & { customerName: string; email: string };

export type SubmitRequestInput = {
  orderNumber: string;
  reason: string;
  /** Who is asking: the signed-in Member who placed the Order, or the Misafir's e-posta on it. */
  requester: { memberId: number } | { email: string };
};

export type ResolveRequestInput = {
  /** Approving makes the Order İptal or İade by the request's kind; rejecting leaves it as it is. */
  outcome: "approve" | "reject";
  note?: string;
};

export type SubmitRequestResult =
  | { ok: true; request: OrderRequest }
  /** No Order of this requester has this number; the same answer whether or not the number exists. */
  | { ok: false; reason: "not-found" }
  /** The Order's Sipariş Durumu allows no request (already İptal or İade, or not yet placed). */
  | { ok: false; reason: "not-eligible" }
  | { ok: false; reason: "already-open" }
  | { ok: false; reason: "missing-reason" };
