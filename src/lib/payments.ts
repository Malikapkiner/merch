import { createFakePaymentProvider } from "@/modules/payment";
import type { FakePaymentProvider, PaymentProvider } from "@/modules/payment";

// Kept on globalThis so dev-server reloads don't forget payments in flight.
const fakePaymentsGlobal = globalThis as { fakePayments?: FakePaymentProvider };

/**
 * The in-memory fake provider, available outside production or when
 * PAYMENT_PROVIDER=fake (e.g. the E2E run). A production build never takes
 * fake payments by accident.
 */
export function fakePaymentProvider(): FakePaymentProvider | undefined {
  if (process.env.NODE_ENV === "production" && process.env.PAYMENT_PROVIDER !== "fake") return undefined;
  fakePaymentsGlobal.fakePayments ??= createFakePaymentProvider({ checkoutPagePath: "/odeme/sahte" });
  return fakePaymentsGlobal.fakePayments;
}

/** The payment provider bound to the app configuration; the iyzico adapter joins in ticket 09. */
export function paymentProvider(): PaymentProvider {
  const fake = fakePaymentProvider();
  if (!fake) throw new Error("No payment provider is configured");
  return fake;
}
