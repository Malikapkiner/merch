import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PaymentRequest } from "./index";
import { createIyzicoPaymentProvider, createIyzicoPaymentProviderFromEnv, IyzicoError } from "./index";

const API_KEY = "sandbox-api-key";
const SECRET_KEY = "sandbox-secret-key";
const BASE_URL = "https://sandbox-api.iyzipay.com";

type SentRequest = { url: string; headers: Record<string, string>; body: string; json: Record<string, unknown> };

/** A stand-in for iyzico's API: records each request and answers with the next scripted response. */
function fakeIyzico(...responses: unknown[]) {
  const sent: SentRequest[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const body = String(init?.body ?? "");
    sent.push({
      url: String(input),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body,
      json: JSON.parse(body),
    });
    const response = responses.shift();
    if (response === undefined) throw new Error("No scripted iyzico response left");
    return new Response(JSON.stringify(response), { status: 200, headers: { "content-type": "application/json" } });
  };
  const provider = createIyzicoPaymentProvider({ apiKey: API_KEY, secretKey: SECRET_KEY, baseUrl: BASE_URL, fetch });
  return { provider, sent };
}

function paymentRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    orderNumber: "K7M2QX9P",
    amountKurus: 75900,
    shippingFeeKurus: 6000,
    callbackUrl: "https://magaza.test/odeme/sonuc",
    customer: {
      name: "Ayşe Nur Yılmaz",
      email: "ayse@example.com",
      phone: "+905321234567",
      identityNumber: null,
      ip: "85.105.12.34",
    },
    shippingAddress: { contactName: "Ayşe Nur Yılmaz", city: "İzmir", address: "Zeytinalanı Mah. Zeytin Sk. No: 3 Urla/İzmir" },
    billingAddress: { contactName: "Zeytin Ltd.", city: "İzmir", address: "Zeytinalanı Mah. Zeytin Sk. No: 3 Çeşme/İzmir" },
    lines: [
      { name: "Erken Hasat Zeytinyağı 500 ml", unitPriceKurus: 23450, quantity: 2 },
      { name: "Biber Salçası 650 g", unitPriceKurus: 23000, quantity: 1 },
    ],
    ...overrides,
  };
}

const INITIALIZED = {
  status: "success",
  conversationId: "K7M2QX9P",
  token: "cf-token-1",
  paymentPageUrl: "https://sandbox-cpp.iyzipay.com?token=cf-token-1&lang=tr",
  checkoutFormContent: "<script>…</script>",
};

describe("iyzico checkout form", () => {
  it("starts a hosted checkout form for the Order and sends the Customer to iyzico's page", async () => {
    const { provider, sent } = fakeIyzico(INITIALIZED);

    const session = await provider.startPayment(paymentRequest());

    expect(session).toEqual({
      token: "cf-token-1",
      redirectUrl: "https://sandbox-cpp.iyzipay.com?token=cf-token-1&lang=tr",
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/initialize/auth/ecom");
    expect(sent[0].json).toMatchObject({
      locale: "tr",
      conversationId: "K7M2QX9P",
      basketId: "K7M2QX9P",
      currency: "TRY",
      paymentGroup: "PRODUCT",
      price: "759.00",
      paidPrice: "759.00",
      // A single payment: an installment surcharge would no longer match the Order total.
      enabledInstallments: [1],
      callbackUrl: "https://magaza.test/odeme/sonuc",
      buyer: {
        id: "ayse@example.com",
        name: "Ayşe Nur",
        surname: "Yılmaz",
        email: "ayse@example.com",
        gsmNumber: "+905321234567",
        identityNumber: "11111111111",
        registrationAddress: "Zeytinalanı Mah. Zeytin Sk. No: 3 Çeşme/İzmir",
        city: "İzmir",
        country: "Turkey",
        ip: "85.105.12.34",
      },
      shippingAddress: {
        contactName: "Ayşe Nur Yılmaz",
        city: "İzmir",
        country: "Turkey",
        address: "Zeytinalanı Mah. Zeytin Sk. No: 3 Urla/İzmir",
      },
      billingAddress: {
        contactName: "Zeytin Ltd.",
        city: "İzmir",
        country: "Turkey",
        address: "Zeytinalanı Mah. Zeytin Sk. No: 3 Çeşme/İzmir",
      },
      basketItems: [
        { id: "1", name: "Erken Hasat Zeytinyağı 500 ml", category1: "Gıda", itemType: "PHYSICAL", price: "469.00" },
        { id: "2", name: "Biber Salçası 650 g", category1: "Gıda", itemType: "PHYSICAL", price: "230.00" },
        { id: "kargo", name: "Kargo", category1: "Kargo", itemType: "PHYSICAL", price: "60.00" },
      ],
    });
  });

  it("signs each request with iyzico's IYZWSv2 scheme", async () => {
    const { provider, sent } = fakeIyzico(INITIALIZED);

    await provider.startPayment(paymentRequest());

    const { headers, body } = sent[0];
    const randomKey = headers["x-iyzi-rnd"];
    expect(randomKey).toMatch(/\S{8,}/);
    expect(headers["content-type"]).toBe("application/json");
    const [scheme, encoded] = headers.authorization.split(" ");
    expect(scheme).toBe("IYZWSv2");
    const expectedSignature = createHmac("sha256", SECRET_KEY)
      .update(randomKey + "/payment/iyzipos/checkoutform/initialize/auth/ecom" + body)
      .digest("hex");
    expect(Buffer.from(encoded, "base64").toString()).toBe(
      `apiKey:${API_KEY}&randomKey:${randomKey}&signature:${expectedSignature}`,
    );
  });

  it("passes the buyer's TCKN and leaves shipping out of the basket when it is free", async () => {
    const { provider, sent } = fakeIyzico(INITIALIZED);

    await provider.startPayment(
      paymentRequest({
        amountKurus: 69900,
        shippingFeeKurus: 0,
        customer: { ...paymentRequest().customer, name: "Ayşe", identityNumber: "12345678901" },
      }),
    );

    expect(sent[0].json).toMatchObject({
      price: "699.00",
      buyer: { name: "Ayşe", surname: "Ayşe", identityNumber: "12345678901" },
    });
    expect((sent[0].json.basketItems as { id: string }[]).map((item) => item.id)).toEqual(["1", "2"]);
  });
});

/** A retrieve response as iyzico sends it, card details included, to prove none of them leak. */
function retrieved(overrides: Record<string, unknown> = {}) {
  return {
    status: "success",
    paymentStatus: "SUCCESS",
    fraudStatus: 1,
    paymentId: "22416036",
    basketId: "K7M2QX9P",
    conversationId: "K7M2QX9P",
    token: "cf-token-1",
    price: 759,
    paidPrice: 759.0,
    currency: "TRY",
    binNumber: "55287900",
    lastFourDigits: "0008",
    cardAssociation: "MASTER_CARD",
    ...overrides,
  };
}

describe("iyzico payment result", () => {
  it("reports a successful payment as iyzico verified it", async () => {
    const { provider, sent } = fakeIyzico(retrieved());

    const result = await provider.retrievePayment("cf-token-1");

    expect(result).toEqual({ status: "succeeded", paymentId: "22416036", orderNumber: "K7M2QX9P", amountKurus: 75900 });
    expect(sent[0].url).toBe("https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/auth/ecom/detail");
    expect(sent[0].json).toMatchObject({ locale: "tr", token: "cf-token-1" });
  });

  it("reports a declined payment as failed", async () => {
    const declined = { paymentStatus: "FAILURE", paymentId: undefined, errorCode: "10051" };
    const { provider } = fakeIyzico(retrieved(declined), retrieved({ ...declined, status: "failure" }));

    expect(await provider.retrievePayment("cf-token-1")).toEqual({ status: "failed" });
    expect(await provider.retrievePayment("cf-token-1")).toEqual({ status: "failed" });
  });

  it("keeps a payment held for fraud review pending until iyzico approves it", async () => {
    const { provider } = fakeIyzico(retrieved({ fraudStatus: 0 }));

    expect(await provider.retrievePayment("cf-token-1")).toEqual({ status: "pending" });
  });

  it("reports a payment rejected by fraud review as failed", async () => {
    const { provider } = fakeIyzico(retrieved({ fraudStatus: -1 }));

    expect(await provider.retrievePayment("cf-token-1")).toEqual({ status: "failed" });
  });

  it("keeps a payment still in 3-D Secure pending", async () => {
    const { provider } = fakeIyzico(retrieved({ paymentStatus: "INIT_THREEDS", paymentId: undefined }));

    expect(await provider.retrievePayment("cf-token-1")).toEqual({ status: "pending" });
  });

  it("throws instead of guessing when iyzico can't answer, without card details in the error", async () => {
    const { provider } = fakeIyzico(
      retrieved({ status: "failure", errorCode: "5115", errorMessage: "Sistem hatası", paymentStatus: undefined }),
    );

    const error = await provider.retrievePayment("cf-token-1").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(IyzicoError);
    expect(error).toMatchObject({ errorCode: "5115" });
    const logged = `${String(error)} ${JSON.stringify(error)}`;
    expect(logged).not.toContain("55287900");
    expect(logged).not.toContain("0008");
  });
});

describe("iyzico payment cancellation", () => {
  it("voids the captured payment", async () => {
    const { provider, sent } = fakeIyzico({ status: "success", paymentId: "22416036", price: 759 });

    await provider.cancelPayment("22416036");

    expect(sent[0].url).toBe("https://sandbox-api.iyzipay.com/payment/cancel");
    expect(sent[0].json).toMatchObject({ locale: "tr", paymentId: "22416036" });
  });

  it("throws when iyzico refuses to cancel, so the refund isn't silently lost", async () => {
    const { provider } = fakeIyzico({ status: "failure", errorCode: "5093", errorMessage: "İptal edilemez" });

    await expect(provider.cancelPayment("22416036")).rejects.toMatchObject({ errorCode: "5093" });
  });
});

describe("iyzico configuration", () => {
  const fullEnv = () => ({
    IYZICO_API_KEY: API_KEY,
    IYZICO_SECRET_KEY: SECRET_KEY,
    IYZICO_BASE_URL: BASE_URL,
  });

  it("builds the iyzico adapter from the full configuration", () => {
    expect(createIyzicoPaymentProviderFromEnv(fullEnv())).toMatchObject({ startPayment: expect.any(Function) });
  });

  it("leaves iyzico unconfigured when no IYZICO_ variable is set", () => {
    expect(createIyzicoPaymentProviderFromEnv({})).toBeUndefined();
  });

  it("rejects a partial configuration by naming every missing variable", () => {
    expect(() => createIyzicoPaymentProviderFromEnv({ IYZICO_API_KEY: API_KEY })).toThrow(
      /IYZICO_SECRET_KEY, IYZICO_BASE_URL/,
    );
  });
});
