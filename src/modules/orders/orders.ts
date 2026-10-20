import { and, asc, count, desc, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import { randomBytes, randomInt } from "node:crypto";
import type { Database, Transaction } from "@/db/client";
import { addToCart, priceCart } from "../cart";
import type { CartItem } from "../cart";
import { createCatalog, decrementStock, InsufficientStockError } from "../catalog";
import { getCurrentVersion } from "../legal";
import type { PaymentAddress, PaymentProvider } from "../payment";
import { createShipping } from "../shipping";
import type { OrderEmails } from "./emails";
import { orderLines, orderLookupAttempts, orders } from "./schema";
import { assertTransition, MissingTrackingNumberError, OrderStatusError } from "./transitions";
import type {
  Address,
  CancellationReason,
  CheckoutInput,
  ConfirmBankTransferResult,
  ConfirmPaymentResult,
  LookupOrderInput,
  LookupOrderResult,
  Order,
  OrderStatus,
  OrderSummary,
  PaymentMethod,
  PlaceBankTransferOrderResult,
  PlaceOrderResult,
} from "./types";
import { validateCheckoutDetails } from "./validation";

export type OrdersOptions = { payments: PaymentProvider; emails: OrderEmails; now?: () => Date };

const MAX_FAILED_LOOKUPS = 5;
const LOOKUP_WINDOW_MS = 15 * 60 * 1000;

/** The documents the Customer accepts at checkout; their versions are stored on the Order. */
const ACCEPTED_DOCUMENT_SLUGS = ["mesafeli-satis-sozlesmesi", "on-bilgilendirme-formu"] as const;

/** No 0/O, 1/I/L: easy to read out over the phone. */
const ORDER_NUMBER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newOrderNumber(): string {
  return Array.from({ length: 8 }, () => ORDER_NUMBER_ALPHABET[randomInt(ORDER_NUMBER_ALPHABET.length)]).join("");
}

function acceptedDocumentVersions(): Record<string, string> {
  return Object.fromEntries(
    ACCEPTED_DOCUMENT_SLUGS.map((slug) => {
      const version = getCurrentVersion(slug);
      if (!version) throw new Error(`Legal document ${slug} is missing`);
      return [slug, version];
    }),
  );
}

function paymentAddress(
  contactName: string,
  address: Pick<Address, "province" | "district" | "neighbourhood" | "addressLine">,
): PaymentAddress {
  return {
    contactName,
    city: address.province,
    address: `${address.neighbourhood} ${address.addressLine} ${address.district}/${address.province}`,
  };
}

const PAYMENT_FAILED: CancellationReason = "payment-failed";

/** Card payment attempts that never completed (still Ödeme Bekliyor, or İptal because the payment failed) are not the Customer's Orders. */
const isCustomerVisible = and(
  or(eq(orders.paymentMethod, "bank_transfer"), ne(orders.status, "awaiting_payment")),
  or(isNull(orders.cancellationReason), ne(orders.cancellationReason, PAYMENT_FAILED)),
)!;
const OUT_OF_STOCK: CancellationReason = "out-of-stock";

type OrderRow = typeof orders.$inferSelect;

type Settlement = {
  orderId: number;
  outcome: "paid" | CancellationReason;
  /** A captured payment the Customer must get back because the Order could not be fulfilled. */
  paymentIdToCancel?: string;
  /** This confirmation made the Order Ödendi; a repeated one reports "paid" without it. */
  justPaid?: boolean;
};

/** The outcome an already settled Order reports again on a repeated confirmation. */
function settledOutcome(order: OrderRow): Settlement["outcome"] {
  if (order.status !== "cancelled") return "paid";
  return order.cancellationReason === OUT_OF_STOCK ? "out-of-stock" : "payment-failed";
}

/** Moves a (locked) Order to a new status, enforcing the transition rules. */
async function moveStatus(
  tx: Transaction,
  order: OrderRow,
  to: OrderStatus,
  changes: Partial<Pick<OrderRow, "paymentId" | "paidAt" | "cancellationReason" | "trackingNumber" | "adminNote">> = {},
): Promise<void> {
  assertTransition(order.status, to);
  await tx.update(orders).set({ ...changes, status: to }).where(eq(orders.id, order.id));
}

/**
 * Orders module (Checkout/Order): places an Order from a browser-held cart,
 * confirms its payment through the Payment provider port, and owns the
 * Sipariş Durumu transitions.
 */
export function createOrders(db: Database, options: OrdersOptions) {
  const { payments, emails } = options;
  const now = options.now ?? (() => new Date());
  const catalog = createCatalog(db);
  const shipping = createShipping(db);

  async function loadOrder(where: ReturnType<typeof eq>): Promise<Order | null> {
    const [row] = await db.select().from(orders).where(where);
    if (!row) return null;
    const lines = await db
      .select({
        variantId: orderLines.variantId,
        productName: orderLines.productName,
        variantName: orderLines.variantName,
        unitPriceKurus: orderLines.unitPriceKurus,
        vatRatePercent: orderLines.vatRatePercent,
        quantity: orderLines.quantity,
        lineTotalKurus: orderLines.lineTotalKurus,
      })
      .from(orderLines)
      .where(eq(orderLines.orderId, row.id))
      .orderBy(asc(orderLines.position));
    return {
      orderNumber: row.orderNumber,
      accessToken: row.accessToken,
      memberId: row.memberId,
      status: row.status,
      paymentMethod: row.paymentMethod,
      email: row.email,
      phone: row.phone,
      shippingAddress: row.shippingAddress,
      billing: row.billing,
      lines,
      subtotalKurus: row.subtotalKurus,
      shippingFeeKurus: row.shippingFeeKurus,
      totalKurus: row.totalKurus,
      acceptedDocuments: row.acceptedDocuments,
      cancellationReason: row.cancellationReason,
      trackingNumber: row.trackingNumber,
      adminNote: row.adminNote,
      createdAt: row.createdAt,
      paidAt: row.paidAt,
    };
  }

  /**
   * Validates the checkout, prices the cart from current Variants and shipping
   * settings, and stores an Ödeme Bekliyor Order with a snapshot of everything
   * the Customer agreed to. Stok is not touched.
   */
  async function createOrder(input: CheckoutInput, method: PaymentMethod) {
    if (!input.acceptedContracts) return { ok: false, reason: "contracts-not-accepted" } as const;
    const validation = validateCheckoutDetails(input);
    if (!validation.ok) return { ok: false, reason: "invalid-details", fields: validation.fields } as const;
    const { details } = validation;

    // Merged per Variant so one Variant can't dodge the Stok check across two lines.
    const items = input.items
      .filter((item) => Number.isInteger(item.variantId) && Number.isInteger(item.quantity))
      .reduce((merged: CartItem[], item) => addToCart(merged, item.variantId, item.quantity), []);
    if (items.length === 0) return { ok: false, reason: "empty-cart" } as const;

    const [variants, settings] = await Promise.all([
      catalog.getVariantsByIds(items.map((item) => item.variantId)),
      shipping.getSettings(),
    ]);
    const totals = priceCart(items, variants, settings);
    if (totals.lines.length !== items.length || totals.exceedsStock) return { ok: false, reason: "cart-changed" } as const;

    const orderNumber = newOrderNumber();
    const accessToken = randomBytes(24).toString("base64url");
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        accessToken,
        paymentMethod: method,
        memberId: input.memberId ?? null,
        email: details.email,
        phone: details.phone,
        shippingAddress: details.shippingAddress,
        billing: details.billing,
        acceptedDocuments: acceptedDocumentVersions(),
        subtotalKurus: totals.subtotalKurus,
        shippingFeeKurus: totals.shippingFeeKurus,
        totalKurus: totals.totalKurus,
      })
      .returning({ id: orders.id });
    await db.insert(orderLines).values(
      totals.lines.map((line, position) => ({
        orderId: order.id,
        variantId: line.id,
        productName: line.productName,
        variantName: line.name,
        unitPriceKurus: line.priceKurus,
        vatRatePercent: line.vatRatePercent,
        quantity: line.quantity,
        lineTotalKurus: line.lineTotalKurus,
        position,
      })),
    );
    return { ok: true, orderId: order.id, orderNumber, accessToken, totals, details } as const;
  }

  return {
    /**
     * Creates an Ödeme Bekliyor Order priced from current Variants and shipping
     * settings, snapshots the details the Customer agreed to, and starts the
     * payment. Stok is not touched until the payment is confirmed.
     */
    async placeOrder(
      input: CheckoutInput,
      placement: { callbackUrl: string; customerIp?: string | null },
    ): Promise<PlaceOrderResult> {
      const created = await createOrder(input, "card");
      if (!created.ok) return created;
      const { orderId, orderNumber, totals } = created;
      const { email, phone, shippingAddress, billing } = created.details;

      const session = await payments.startPayment({
        orderNumber,
        amountKurus: totals.totalKurus,
        shippingFeeKurus: totals.shippingFeeKurus,
        callbackUrl: placement.callbackUrl,
        customer: {
          name: shippingAddress.fullName,
          email,
          phone,
          // An 11-digit tax number is a TCKN; a 10-digit VKN identifies a company, not the Customer.
          identityNumber: billing.taxNumber?.length === 11 ? billing.taxNumber : null,
          ip: placement.customerIp ?? null,
        },
        shippingAddress: paymentAddress(shippingAddress.fullName, shippingAddress),
        billingAddress: paymentAddress(billing.name, billing),
        lines: totals.lines.map((line) => ({
          name: `${line.productName} ${line.name}`,
          unitPriceKurus: line.priceKurus,
          quantity: line.quantity,
        })),
      });
      await db.update(orders).set({ paymentToken: session.token }).where(eq(orders.id, orderId));
      return { ok: true, orderNumber, paymentUrl: session.redirectUrl };
    },

    /**
     * Creates a Havale Siparişi: an Ödeme Bekliyor Order that waits for the
     * Admin to confirm the transfer. Stok is not touched until then.
     */
    async placeBankTransferOrder(input: CheckoutInput): Promise<PlaceBankTransferOrderResult> {
      const created = await createOrder(input, "bank_transfer");
      if (!created.ok) return created;
      const order = (await loadOrder(eq(orders.id, created.orderId))) as Order;
      await emails.bankTransferOrderReceived(order);
      return { ok: true, orderNumber: created.orderNumber, accessToken: created.accessToken };
    },

    /**
     * Confirms the payment behind a provider token, as the provider reports it
     * server-side. On success, Stok drops atomically and the Order becomes
     * Ödendi in one transaction. A declined attempt leaves the Order Ödeme
     * Bekliyor, since the Customer may still pay with another card on the
     * provider's page; a payment arriving for an İptal Order is given back.
     * Repeating a confirmation (e.g. a provider retry) returns the first
     * outcome and changes nothing.
     */
    async confirmPayment(token: string): Promise<ConfirmPaymentResult> {
      const result = await payments.retrievePayment(token);
      // Not settled yet (a premature callback, or a payment held for fraud review): leave the Order open
      // for a later notification to settle.
      if (result.status === "pending") return { ok: false, reason: "payment-pending" };

      const settlement = await db.transaction(async (tx): Promise<Settlement | null> => {
        // The row lock serialises confirmations of the same Order.
        const [order] = await tx.select().from(orders).where(eq(orders.paymentToken, token)).for("update");
        if (!order) return null;
        if (order.status !== "awaiting_payment") {
          // A payment captured after the Order was closed (e.g. cancelled while the Customer was still on the
          // provider's page) is given back; recording its id makes a repeated notification skip the refund.
          if (order.status === "cancelled" && result.status === "succeeded" && result.paymentId !== order.paymentId) {
            await tx.update(orders).set({ paymentId: result.paymentId }).where(eq(orders.id, order.id));
            return { orderId: order.id, outcome: settledOutcome(order), paymentIdToCancel: result.paymentId };
          }
          return { orderId: order.id, outcome: settledOutcome(order) };
        }

        // A declined attempt isn't final: the provider's page lets the Customer try another card with the same
        // token, so the Order stays open for a later successful payment.
        if (result.status !== "succeeded") return { orderId: order.id, outcome: "payment-failed" };
        if (result.orderNumber !== order.orderNumber || result.amountKurus !== order.totalKurus) {
          // Charged, but not for this Order as placed: never fulfil it, give the money back.
          await moveStatus(tx, order, "cancelled", { cancellationReason: PAYMENT_FAILED, paymentId: result.paymentId });
          return { orderId: order.id, outcome: "payment-failed", paymentIdToCancel: result.paymentId };
        }

        const lines = await tx
          .select({ variantId: orderLines.variantId, quantity: orderLines.quantity })
          .from(orderLines)
          .where(eq(orderLines.orderId, order.id));
        try {
          // A savepoint, so a shortfall undoes only the Stok updates and the Order can still be cancelled.
          await tx.transaction((savepoint) => decrementStock(savepoint, lines));
        } catch (error) {
          if (!(error instanceof InsufficientStockError)) throw error;
          await moveStatus(tx, order, "cancelled", { cancellationReason: OUT_OF_STOCK, paymentId: result.paymentId });
          return { orderId: order.id, outcome: "out-of-stock", paymentIdToCancel: result.paymentId };
        }
        await moveStatus(tx, order, "paid", { paymentId: result.paymentId, paidAt: new Date() });
        return { orderId: order.id, outcome: "paid", justPaid: true };
      });

      // Only the confirmation that cancelled the Order gets here with a payment to give back.
      if (settlement?.paymentIdToCancel) {
        const paymentId = settlement.paymentIdToCancel;
        await payments.cancelPayment(paymentId).catch((error: unknown) => {
          // The Order is already İptal and the Customer is told so; the money goes back by hand.
          console.error(`Payment ${paymentId} could not be cancelled; refund it in the provider's panel.`, error);
        });
      }

      if (settlement === null) return { ok: false, reason: "payment-failed" };
      if (settlement.outcome !== "paid") return { ok: false, reason: settlement.outcome };
      const order = (await loadOrder(eq(orders.id, settlement.orderId))) as Order;
      // Only the confirmation that made the Order Ödendi sends the Sipariş onayı, so a retry never sends it twice.
      if (settlement.justPaid) await emails.orderConfirmed(order);
      return { ok: true, order };
    },

    /**
     * The Admin has seen the transfer arrive: Stok drops atomically and the
     * Havale Siparişi becomes Ödendi in one transaction. When a Variant has
     * run short the Order stays Ödeme Bekliyor with Stok untouched, and the
     * result names the Variant so the Admin can act. Anything but an Ödeme
     * Bekliyor bank transfer Order is rejected with `OrderStatusError`.
     */
    async confirmBankTransfer(orderNumber: string): Promise<ConfirmBankTransferResult> {
      const outcome = await db.transaction(async (tx): Promise<{ variantName: string } | null> => {
        const [order] = await tx.select().from(orders).where(eq(orders.orderNumber, orderNumber)).for("update");
        if (!order) throw new Error("Order not found");
        if (order.paymentMethod !== "bank_transfer") throw new OrderStatusError(order.status, "paid");
        assertTransition(order.status, "paid");

        const lines = await tx
          .select({
            variantId: orderLines.variantId,
            quantity: orderLines.quantity,
            productName: orderLines.productName,
            variantName: orderLines.variantName,
          })
          .from(orderLines)
          .where(eq(orderLines.orderId, order.id));
        try {
          // A savepoint, so a shortfall on a later line also undoes the Stok taken for the earlier ones.
          await tx.transaction((savepoint) => decrementStock(savepoint, lines));
        } catch (error) {
          if (!(error instanceof InsufficientStockError)) throw error;
          const short = lines.find((line) => line.variantId === error.variantId);
          return { variantName: short ? `${short.productName} ${short.variantName}` : "Bilinmeyen ürün" };
        }
        await moveStatus(tx, order, "paid", { paidAt: new Date() });
        return null;
      });

      if (outcome) return { ok: false, reason: "insufficient-stock", variantName: outcome.variantName };
      const order = (await loadOrder(eq(orders.orderNumber, orderNumber))) as Order;
      await emails.orderConfirmed(order);
      return { ok: true, order };
    },

    /**
     * Moves an Order to its next Sipariş Durumu, rejecting skipped steps and
     * moves out of İptal or İade with `OrderStatusError`. Ödendi is never set
     * here: only a confirmed payment, which also takes Stok, makes an Order paid.
     * Kargoda needs a tracking number (`MissingTrackingNumberError` otherwise)
     * and sends the Customer the shipping notice; İptal and İade keep the
     * Admin's note. The refund itself is made in the provider's panel.
     */
    async changeStatus(
      orderNumber: string,
      to: OrderStatus,
      details: { trackingNumber?: string; note?: string } = {},
    ): Promise<void> {
      const trackingNumber = details.trackingNumber?.trim() || null;
      const note = details.note?.trim() || null;
      await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.orderNumber, orderNumber)).for("update");
        if (!order) throw new Error("Order not found");
        if (to === "paid") throw new OrderStatusError(order.status, to);
        assertTransition(order.status, to);
        if (to === "shipped" && !trackingNumber) throw new MissingTrackingNumberError();
        await moveStatus(tx, order, to, {
          ...(to === "shipped" && { trackingNumber }),
          ...((to === "cancelled" || to === "returned") && { adminNote: note }),
        });
      });
      // After the commit: the move is settled, and a failed e-mail never undoes it.
      if (to === "shipped") {
        await emails.orderShipped((await loadOrder(eq(orders.orderNumber, orderNumber))) as Order, trackingNumber as string);
      }
    },

    /** Orders newest first, optionally only those in one Sipariş Durumu. */
    async listOrders(filter: { status?: OrderStatus } = {}): Promise<OrderSummary[]> {
      const rows = await db
        .select()
        .from(orders)
        .where(filter.status ? eq(orders.status, filter.status) : undefined)
        .orderBy(desc(orders.createdAt), desc(orders.id));
      return rows.map((row) => ({
        orderNumber: row.orderNumber,
        status: row.status,
        customerName: row.shippingAddress.fullName,
        email: row.email,
        totalKurus: row.totalKurus,
        createdAt: row.createdAt,
      }));
    },

    async getOrder(orderNumber: string): Promise<Order | null> {
      return loadOrder(eq(orders.orderNumber, orderNumber));
    },

    /**
     * A Member's Orders, newest first. Card payment attempts that never completed
     * (still Ödeme Bekliyor, or İptal because the payment failed) are left out.
     */
    async listOrdersForMember(memberId: number): Promise<Order[]> {
      const rows = await db
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .where(and(eq(orders.memberId, memberId), isCustomerVisible))
        .orderBy(desc(orders.createdAt), desc(orders.id));
      const history = await Promise.all(rows.map((row) => loadOrder(eq(orders.orderNumber, row.orderNumber))));
      return history.filter((order): order is Order => order !== null);
    },

    /**
     * A Misafir's lookup: the Order is shown only when the number and e-posta match. Unknown
     * numbers and wrong e-postas give the same answer so the lookup never confirms an Order exists.
     */
    async lookupOrder(input: LookupOrderInput): Promise<LookupOrderResult> {
      const attemptedAt = now();
      const windowStart = new Date(attemptedAt.getTime() - LOOKUP_WINDOW_MS);
      const { clientKey } = input;
      return db.transaction(async (tx): Promise<LookupOrderResult> => {
        // Serialise one client's lookups so concurrent guesses cannot each read an under-limit count.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`order-lookup:${clientKey}`}))`);
        await tx.delete(orderLookupAttempts).where(lt(orderLookupAttempts.attemptedAt, windowStart));
        const [{ failures }] = await tx
          .select({ failures: count() })
          .from(orderLookupAttempts)
          .where(eq(orderLookupAttempts.clientKey, clientKey));
        if (failures >= MAX_FAILED_LOOKUPS) return { ok: false, reason: "rate-limited" };

        const order = await loadOrder(
          and(eq(orders.orderNumber, input.orderNumber.trim().toUpperCase()), isCustomerVisible)!,
        );
        if (!order || order.email !== input.email.trim().toLowerCase()) {
          await tx.insert(orderLookupAttempts).values({ clientKey, attemptedAt });
          return { ok: false, reason: "not-found" };
        }
        return { ok: true, order };
      });
    },

    /** The Order behind a confirmation page link, or null for an unknown token. */
    async getOrderByAccessToken(accessToken: string): Promise<Order | null> {
      return loadOrder(eq(orders.accessToken, accessToken));
    },
  };
}

export type Orders = ReturnType<typeof createOrders>;
