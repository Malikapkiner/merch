import { randomUUID } from "node:crypto";

// Payment provider port. A provider hosts the card form (ADR 0003): the
// Customer is sent to `redirectUrl`, comes back to `callbackUrl` with the
// token, and the server asks the provider for the verified result.

export type PaymentRequest = {
  orderNumber: string;
  /** Amount to charge in kuruş, KDV and shipping included. */
  amountKurus: number;
  /** Where the provider sends the Customer back, with the payment token. */
  callbackUrl: string;
  customer: { name: string; email: string; phone: string };
  lines: { name: string; unitPriceKurus: number; quantity: number }[];
};

export type PaymentSession = {
  /** Identifies the payment on the callback; stored on the Order. */
  token: string;
  /** The provider's hosted payment page. */
  redirectUrl: string;
};

export type PaymentResult =
  | { status: "succeeded"; paymentId: string; orderNumber: string; amountKurus: number }
  /** The Customer hasn't finished on the provider's page yet; nothing is settled. */
  | { status: "pending" }
  | { status: "failed" };

export type PaymentProvider = {
  startPayment(request: PaymentRequest): Promise<PaymentSession>;
  /** The provider's own, server-verified result for a token; never trust the callback body. */
  retrievePayment(token: string): Promise<PaymentResult>;
  /** Voids or refunds a captured payment, e.g. when Stok ran out before confirmation. */
  cancelPayment(paymentId: string): Promise<void>;
};

type FakeSession = {
  request: PaymentRequest;
  outcome: "pending" | "approved" | "declined";
  paymentId: string;
  /** What the fake reports as charged; the requested amount unless a test overrides it. */
  chargedKurus: number;
};

/** In-memory provider for tests and local development; also lets a caller decide the outcome. */
export type FakePaymentProvider = PaymentProvider & {
  /** The request behind a token, or undefined for an unknown token. */
  session(token: string): PaymentRequest | undefined;
  /** Approves the payment; `amountKurus` simulates a provider reporting a different charge. */
  approve(token: string, overrides?: { amountKurus?: number }): void;
  decline(token: string): void;
  cancelledPaymentIds(): string[];
};

/** `checkoutPagePath` is the app page standing in for the provider's hosted form. */
export function createFakePaymentProvider(
  options: { checkoutPagePath?: string } = {},
): FakePaymentProvider {
  const checkoutPagePath = options.checkoutPagePath ?? "/fake-payment";
  const sessions = new Map<string, FakeSession>();
  const cancelled: string[] = [];

  function settle(token: string, outcome: FakeSession["outcome"]): FakeSession {
    const session = sessions.get(token);
    if (!session) throw new Error("Unknown payment token");
    session.outcome = outcome;
    return session;
  }

  return {
    async startPayment(request) {
      const token = randomUUID();
      sessions.set(token, {
        request,
        outcome: "pending",
        paymentId: `fake-${randomUUID()}`,
        chargedKurus: request.amountKurus,
      });
      return { token, redirectUrl: `${checkoutPagePath}?token=${encodeURIComponent(token)}` };
    },
    async retrievePayment(token) {
      const session = sessions.get(token);
      if (session?.outcome === "pending") return { status: "pending" };
      if (!session || session.outcome !== "approved") return { status: "failed" };
      return {
        status: "succeeded",
        paymentId: session.paymentId,
        orderNumber: session.request.orderNumber,
        amountKurus: session.chargedKurus,
      };
    },
    async cancelPayment(paymentId) {
      cancelled.push(paymentId);
    },
    session(token) {
      return sessions.get(token)?.request;
    },
    approve(token, overrides = {}) {
      const session = settle(token, "approved");
      session.chargedKurus = overrides.amountKurus ?? session.request.amountKurus;
    },
    decline(token) {
      settle(token, "declined");
    },
    cancelledPaymentIds() {
      return cancelled;
    },
  };
}
