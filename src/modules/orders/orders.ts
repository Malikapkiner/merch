import { asc, eq } from "drizzle-orm";
import { randomBytes, randomInt } from "node:crypto";
import type { Database, Transaction } from "@/db/client";
import { addToCart, priceCart } from "../cart";
import type { CartItem } from "../cart";
import { createCatalog, decrementStock, InsufficientStockError } from "../catalog";
import { getCurrentVersion } from "../legal";
import type { PaymentAddress, PaymentProvider } from "../payment";
import { createShipping } from "../shipping";
import { orderLines, orders } from "./schema";
import { assertTransition, OrderStatusError } from "./transitions";
import type {
  Address,
  CancellationReason,
  CheckoutInput,
  ConfirmPaymentResult,
  Order,
  OrderStatus,
  PlaceOrderResult,
} from "./types";
import { validateCheckoutDetails } from "./validation";

export type OrdersOptions = { payments: PaymentProvider };

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
const OUT_OF_STOCK: CancellationReason = "out-of-stock";

type OrderRow = typeof orders.$inferSelect;

type Settlement = {
  orderId: number;
  outcome: "paid" | CancellationReason;
  /** A captured payment the Customer must get back because the Order could not be fulfilled. */
  paymentIdToCancel?: string;
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
  changes: Partial<Pick<OrderRow, "paymentId" | "paidAt" | "cancellationReason">> = {},
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
  const { payments } = options;
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
      status: row.status,
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
      createdAt: row.createdAt,
      paidAt: row.paidAt,
    };
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
      if (!input.acceptedContracts) return { ok: false, reason: "contracts-not-accepted" };
      const validation = validateCheckoutDetails(input);
      if (!validation.ok) return { ok: false, reason: "invalid-details", fields: validation.fields };
      const { email, phone, shippingAddress, billing } = validation.details;

      // Merged per Variant so one Variant can't dodge the Stok check across two lines.
      const items = input.items
        .filter((item) => Number.isInteger(item.variantId) && Number.isInteger(item.quantity))
        .reduce((merged: CartItem[], item) => addToCart(merged, item.variantId, item.quantity), []);
      if (items.length === 0) return { ok: false, reason: "empty-cart" };

      const [variants, settings] = await Promise.all([
        catalog.getVariantsByIds(items.map((item) => item.variantId)),
        shipping.getSettings(),
      ]);
      const totals = priceCart(items, variants, settings);
      if (totals.lines.length !== items.length || totals.exceedsStock) return { ok: false, reason: "cart-changed" };

      const orderNumber = newOrderNumber();
      const [order] = await db
        .insert(orders)
        .values({
          orderNumber,
          accessToken: randomBytes(24).toString("base64url"),
          email,
          phone,
          shippingAddress,
          billing,
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
      await db.update(orders).set({ paymentToken: session.token }).where(eq(orders.id, order.id));
      return { ok: true, orderNumber, paymentUrl: session.redirectUrl };
    },

    /**
     * Confirms the payment behind a provider token, as the provider reports it
     * server-side. On success, Stok drops atomically and the Order becomes
     * Ödendi in one transaction; a declined payment makes the Order İptal.
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
        if (order.status !== "awaiting_payment") return { orderId: order.id, outcome: settledOutcome(order) };

        if (result.status !== "succeeded") {
          await moveStatus(tx, order, "cancelled", { cancellationReason: PAYMENT_FAILED });
          return { orderId: order.id, outcome: "payment-failed" };
        }
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
        return { orderId: order.id, outcome: "paid" };
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
      return { ok: true, order: (await loadOrder(eq(orders.id, settlement.orderId))) as Order };
    },

    /**
     * Moves an Order to its next Sipariş Durumu, rejecting skipped steps and
     * moves out of İptal or İade with `OrderStatusError`. Ödendi is never set
     * here: only a confirmed payment, which also takes Stok, makes an Order paid.
     */
    async changeStatus(orderNumber: string, to: OrderStatus): Promise<void> {
      await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.orderNumber, orderNumber)).for("update");
        if (!order) throw new Error("Order not found");
        if (to === "paid") throw new OrderStatusError(order.status, to);
        await moveStatus(tx, order, to);
      });
    },

    async getOrder(orderNumber: string): Promise<Order | null> {
      return loadOrder(eq(orders.orderNumber, orderNumber));
    },

    /** The Order behind a confirmation page link, or null for an unknown token. */
    async getOrderByAccessToken(accessToken: string): Promise<Order | null> {
      return loadOrder(eq(orders.accessToken, accessToken));
    },
  };
}

export type Orders = ReturnType<typeof createOrders>;
