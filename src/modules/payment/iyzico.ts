import { createHmac, randomBytes } from "node:crypto";
import type { PaymentAddress, PaymentProvider, PaymentRequest } from "./payment";

export type IyzicoConfig = {
  apiKey: string;
  secretKey: string;
  /** https://sandbox-api.iyzipay.com or https://api.iyzipay.com. */
  baseUrl: string;
  /** Injectable for tests; the global fetch otherwise. */
  fetch?: typeof globalThis.fetch;
};

/**
 * An iyzico API call that didn't succeed. Carries only iyzico's error code and
 * message, never the request or response, so logging it can't leak card or
 * buyer data.
 */
export class IyzicoError extends Error {
  constructor(
    readonly operation: string,
    readonly errorCode: string | undefined,
    errorMessage: string | undefined,
  ) {
    super(`iyzico ${operation} failed${errorCode ? ` (${errorCode})` : ""}: ${errorMessage ?? "no message"}`);
  }
}

const INITIALIZE_PATH = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const RETRIEVE_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail";
const CANCEL_PATH = "/payment/cancel";

const REQUEST_TIMEOUT_MS = 15_000;

/** iyzico requires a national id; this is its documented placeholder when the buyer gave none. */
const PLACEHOLDER_IDENTITY_NUMBER = "11111111111";
const COUNTRY = "Turkey";

/** 75900 -> "759.00" */
function lira(kurus: number): string {
  return (kurus / 100).toFixed(2);
}

/** 759 or "759.0" -> 75900 */
function kurus(lira: unknown): number {
  return Math.round(Number(lira) * 100);
}

/** "Ayşe Nur Yılmaz" -> name "Ayşe Nur", surname "Yılmaz"; a single word fills both. */
function splitName(fullName: string): { name: string; surname: string } {
  const words = fullName.trim().split(/\s+/);
  const surname = words.pop() ?? "";
  return { name: words.join(" ") || surname, surname };
}

function address(address: PaymentAddress) {
  return { contactName: address.contactName, city: address.city, country: COUNTRY, address: address.address };
}

/** The fields of an iyzico response this adapter reads; everything else (card details included) is ignored. */
type IyzicoBody = {
  status?: unknown;
  errorCode?: unknown;
  errorMessage?: unknown;
  token?: unknown;
  paymentPageUrl?: unknown;
  paymentStatus?: unknown;
  fraudStatus?: unknown;
  paymentId?: unknown;
  basketId?: unknown;
  paidPrice?: unknown;
};

function failure(operation: string, body: IyzicoBody): IyzicoError {
  return new IyzicoError(
    operation,
    typeof body.errorCode === "string" ? body.errorCode : undefined,
    typeof body.errorMessage === "string" ? body.errorMessage : undefined,
  );
}

function basketItems(request: PaymentRequest) {
  const items = request.lines.map((line, index) => ({
    id: String(index + 1),
    name: line.name,
    category1: "Gıda",
    itemType: "PHYSICAL",
    price: lira(line.unitPriceKurus * line.quantity),
  }));
  // iyzico rejects zero-priced items, and the basket must add up to the charged amount.
  if (request.shippingFeeKurus > 0) {
    items.push({ id: "kargo", name: "Kargo", category1: "Kargo", itemType: "PHYSICAL", price: lira(request.shippingFeeKurus) });
  }
  return items;
}

/**
 * Adapter for iyzico's hosted checkout form (ADR 0003). The Customer enters
 * card details on iyzico's page only; this adapter never sees them, and keeps
 * nothing from iyzico's responses beyond the fields the port returns.
 */
export function createIyzicoPaymentProvider(config: IyzicoConfig): PaymentProvider {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const fetch = config.fetch ?? globalThis.fetch;

  /** POSTs a signed request and returns iyzico's JSON body; throws IyzicoError when there is none. */
  async function send(operation: string, path: string, payload: Record<string, unknown>): Promise<IyzicoBody> {
    const body = JSON.stringify(payload);
    const randomKey = randomBytes(12).toString("hex");
    const signature = createHmac("sha256", config.secretKey).update(randomKey + path + body).digest("hex");
    const authorization = Buffer.from(`apiKey:${config.apiKey}&randomKey:${randomKey}&signature:${signature}`).toString(
      "base64",
    );
    const response = await fetch(baseUrl + path, {
      method: "POST",
      headers: {
        Authorization: `IYZWSv2 ${authorization}`,
        "x-iyzi-rnd": randomKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const result: unknown = await response.json().catch(() => null);
    if (typeof result !== "object" || result === null) throw new IyzicoError(operation, `http-${response.status}`, undefined);
    return result as IyzicoBody;
  }

  /** Like `send`, but also throws IyzicoError unless iyzico reports success. */
  async function call(operation: string, path: string, payload: Record<string, unknown>): Promise<IyzicoBody> {
    const result = await send(operation, path, payload);
    if (result.status !== "success") throw failure(operation, result);
    return result;
  }

  return {
    async startPayment(request) {
      const price = lira(request.amountKurus);
      const result = await call("checkout form initialize", INITIALIZE_PATH, {
        locale: "tr",
        conversationId: request.orderNumber,
        price,
        paidPrice: price,
        currency: "TRY",
        basketId: request.orderNumber,
        paymentGroup: "PRODUCT",
        callbackUrl: request.callbackUrl,
        // A single payment: an installment surcharge would no longer match the Order total.
        enabledInstallments: [1],
        buyer: {
          id: request.customer.email,
          ...splitName(request.customer.name),
          email: request.customer.email,
          gsmNumber: request.customer.phone,
          identityNumber: request.customer.identityNumber ?? PLACEHOLDER_IDENTITY_NUMBER,
          registrationAddress: request.billingAddress.address,
          city: request.billingAddress.city,
          country: COUNTRY,
          ...(request.customer.ip ? { ip: request.customer.ip } : {}),
        },
        shippingAddress: address(request.shippingAddress),
        billingAddress: address(request.billingAddress),
        basketItems: basketItems(request),
      });
      return { token: String(result.token), redirectUrl: String(result.paymentPageUrl) };
    },

    async retrievePayment(token) {
      const result = await send("checkout form retrieve", RETRIEVE_PATH, { locale: "tr", token });
      // A declined card can come back as a failed request too; either way it is iyzico's verdict, not an outage.
      if (result.paymentStatus === "FAILURE") return { status: "failed" };
      if (result.status !== "success") throw failure("checkout form retrieve", result);
      if (result.paymentStatus !== "SUCCESS") return { status: "pending" };
      // Only fraudStatus 1 may ship; 0 is under review and settles later through a notification.
      if (result.fraudStatus === -1) return { status: "failed" };
      if (result.fraudStatus !== 1) return { status: "pending" };
      return {
        status: "succeeded",
        paymentId: String(result.paymentId),
        orderNumber: String(result.basketId),
        amountKurus: kurus(result.paidPrice),
      };
    },

    async cancelPayment(paymentId) {
      await call("cancel", CANCEL_PATH, { locale: "tr", paymentId });
    },
  };
}

const IYZICO_VARIABLES = ["IYZICO_API_KEY", "IYZICO_SECRET_KEY", "IYZICO_BASE_URL"] as const;

/**
 * Builds the iyzico adapter from environment configuration: the full variable
 * set produces the adapter, an empty set means iyzico is unconfigured, and a
 * partial set is a mistake to fail loudly on.
 */
export function createIyzicoPaymentProviderFromEnv(
  variables: Record<string, string | undefined>,
): PaymentProvider | undefined {
  const values = IYZICO_VARIABLES.map((name) => variables[name]);
  if (values.every((value) => !value)) return undefined;
  const missing = IYZICO_VARIABLES.filter((_, index) => !values[index]);
  if (missing.length > 0) {
    throw new Error(`iyzico is missing required variables: ${missing.join(", ")}`);
  }
  const [apiKey, secretKey, baseUrl] = values as [string, string, string];
  return createIyzicoPaymentProvider({ apiKey, secretKey, baseUrl });
}
