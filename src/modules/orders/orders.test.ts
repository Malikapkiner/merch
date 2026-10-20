import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { openTestDatabase } from "../../../tests/database";
import { createCatalog } from "../catalog";
import { createFakePaymentProvider } from "../payment";
import type { FakePaymentProvider } from "../payment";
import { createFakeEmailSender } from "../notifications";
import type { FakeEmailSender } from "../notifications";
import { createShipping } from "../shipping";
import type { CheckoutInput } from "./index";
import { createOrderEmails, createOrders, MissingTrackingNumberError, OrderStatusError } from "./index";

const testDb = openTestDatabase();
const catalog = createCatalog(testDb.db);
const shipping = createShipping(testDb.db);
let payments: FakePaymentProvider;
let mail: FakeEmailSender;
let orders: ReturnType<typeof createOrders>;

const BANK_ACCOUNT = { bankName: "Örnek Bank", accountHolder: "Zeytin Evi Gıda Ltd. Şti.", iban: "TR33 0006 1005 1978 6457 8413 26" };
const CALLBACK_URL = "https://magaza.test/odeme/sonuc";

beforeEach(async () => {
  await testDb.truncateAll();
  payments = createFakePaymentProvider();
  mail = createFakeEmailSender();
  orders = createOrders(testDb.db, { payments, emails: createOrderEmails({ sender: mail, brandName: "Zeytin Evi", bankAccount: BANK_ACCOUNT }) });
});
afterAll(() => testDb.close());

async function variantWith(input: { priceKurus: number; vatRatePercent?: number; stock: number; name?: string }) {
  const slug = `urun-${Math.random().toString(36).slice(2, 8)}`;
  const product = await catalog.createProduct({ slug, name: "Erken Hasat Zeytinyağı" });
  await catalog.addVariant(product.id, {
    name: input.name ?? "500 ml",
    priceKurus: input.priceKurus,
    vatRatePercent: input.vatRatePercent ?? 1,
    stock: input.stock,
  });
  const [variant] = (await catalog.getProductForAdmin(product.id))!.variants;
  return variant;
}

async function stockOf(variantId: number): Promise<number> {
  const [variant] = await catalog.getVariantsByIds([variantId]);
  return variant.stock;
}

function checkout(overrides: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    items: [],
    email: "Ayse@Example.com",
    phone: "0532 123 45 67",
    shippingAddress: {
      fullName: "Ayşe Yılmaz",
      province: "İzmir",
      district: "Urla",
      neighbourhood: "Zeytinalanı Mah.",
      addressLine: "Zeytin Sk. No: 3",
    },
    billing: {
      name: "Ayşe Yılmaz",
      province: "İzmir",
      district: "Urla",
      neighbourhood: "Zeytinalanı Mah.",
      addressLine: "Zeytin Sk. No: 3",
      taxNumber: null,
    },
    acceptedContracts: true,
    ...overrides,
  };
}

/** Places an Order and returns its payment token, failing the test if placement fails. */
async function placeOrder(input: CheckoutInput) {
  const result = await orders.placeOrder(input, { callbackUrl: CALLBACK_URL, customerIp: "85.105.12.34" });
  if (!result.ok) throw new Error(`placement failed: ${result.reason}`);
  const token = new URL(result.paymentUrl, "https://magaza.test").searchParams.get("token")!;
  return { orderNumber: result.orderNumber, token };
}

describe("Placing an Order", () => {
  it("creates an Ödeme Bekliyor Order with a snapshot and starts the payment", async () => {
    await shipping.setSettings({ shippingFeeKurus: 6000, freeShippingThresholdKurus: 100000 });
    const oil = await variantWith({ priceKurus: 34950, vatRatePercent: 1, stock: 5, name: "500 ml" });

    const { orderNumber, token } = await placeOrder(
      checkout({ items: [{ variantId: oil.id, quantity: 2 }], billing: { ...checkout().billing, taxNumber: "1234567890" } }),
    );

    const order = await orders.getOrder(orderNumber);
    expect(order).toMatchObject({
      status: "awaiting_payment",
      email: "ayse@example.com",
      phone: "+905321234567",
      shippingAddress: { fullName: "Ayşe Yılmaz", province: "İzmir", district: "Urla" },
      billing: { name: "Ayşe Yılmaz", taxNumber: "1234567890" },
      lines: [
        {
          variantId: oil.id,
          productName: "Erken Hasat Zeytinyağı",
          variantName: "500 ml",
          unitPriceKurus: 34950,
          vatRatePercent: 1,
          quantity: 2,
          lineTotalKurus: 69900,
        },
      ],
      subtotalKurus: 69900,
      shippingFeeKurus: 6000,
      totalKurus: 75900,
      acceptedDocuments: { "mesafeli-satis-sozlesmesi": "1", "on-bilgilendirme-formu": "1" },
      paidAt: null,
    });
    expect(payments.session(token)).toMatchObject({
      orderNumber,
      amountKurus: 75900,
      callbackUrl: CALLBACK_URL,
    });
  });

  it("gives the provider the shipping fee, both addresses and the Customer's TCKN", async () => {
    await shipping.setSettings({ shippingFeeKurus: 6000, freeShippingThresholdKurus: 100000 });
    const oil = await variantWith({ priceKurus: 34950, stock: 5, name: "500 ml" });

    const { token } = await placeOrder(
      checkout({
        items: [{ variantId: oil.id, quantity: 2 }],
        billing: { ...checkout().billing, name: "Zeytin Ltd.", district: "Çeşme", taxNumber: "12345678901" },
      }),
    );

    expect(payments.session(token)).toMatchObject({
      amountKurus: 75900,
      shippingFeeKurus: 6000,
      customer: { name: "Ayşe Yılmaz", email: "ayse@example.com", phone: "+905321234567", identityNumber: "12345678901", ip: "85.105.12.34" },
      shippingAddress: { contactName: "Ayşe Yılmaz", city: "İzmir", address: "Zeytinalanı Mah. Zeytin Sk. No: 3 Urla/İzmir" },
      billingAddress: { contactName: "Zeytin Ltd.", city: "İzmir", address: "Zeytinalanı Mah. Zeytin Sk. No: 3 Çeşme/İzmir" },
      lines: [{ name: "Erken Hasat Zeytinyağı 500 ml", unitPriceKurus: 34950, quantity: 2 }],
    });
  });

  it("gives the provider no identity number when the tax number is a company VKN", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });

    const { token } = await placeOrder(
      checkout({ items: [{ variantId: oil.id, quantity: 1 }], billing: { ...checkout().billing, taxNumber: "1234567890" } }),
    );

    expect(payments.session(token)?.customer.identityNumber).toBeNull();
  });

  it("refuses to start a payment until the contracts are accepted", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });

    const result = await orders.placeOrder(
      checkout({ items: [{ variantId: oil.id, quantity: 1 }], acceptedContracts: false }),
      { callbackUrl: CALLBACK_URL },
    );

    expect(result).toEqual({ ok: false, reason: "contracts-not-accepted" });
  });

  it("reports each invalid field instead of placing the Order", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });

    const result = await orders.placeOrder(
      checkout({
        items: [{ variantId: oil.id, quantity: 1 }],
        email: "not-an-email",
        phone: "123",
        shippingAddress: { ...checkout().shippingAddress, district: "Çankaya", neighbourhood: "  " },
        billing: { ...checkout().billing, name: "", province: "Atlantis", taxNumber: "12AB" },
      }),
      { callbackUrl: CALLBACK_URL },
    );

    expect(result).toEqual({
      ok: false,
      reason: "invalid-details",
      fields: ["email", "phone", "district", "neighbourhood", "billingProvince", "billingDistrict", "taxNumber"],
    });
  });

  it("invoices the recipient when no billing name is given", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });

    const { orderNumber } = await placeOrder(
      checkout({ items: [{ variantId: oil.id, quantity: 1 }], billing: { ...checkout().billing, name: "  " } }),
    );

    expect((await orders.getOrder(orderNumber))?.billing.name).toBe("Ayşe Yılmaz");
  });

  it("accepts a VKN or TCKN as the tax number", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const items = [{ variantId: oil.id, quantity: 1 }];

    const withVkn = await placeOrder(checkout({ items, billing: { ...checkout().billing, taxNumber: "1234567890" } }));
    const withTckn = await placeOrder(checkout({ items, billing: { ...checkout().billing, taxNumber: "12345678901" } }));

    expect((await orders.getOrder(withVkn.orderNumber))?.billing.taxNumber).toBe("1234567890");
    expect((await orders.getOrder(withTckn.orderNumber))?.billing.taxNumber).toBe("12345678901");
  });

  it("refuses an empty cart", async () => {
    const result = await orders.placeOrder(checkout({ items: [] }), { callbackUrl: CALLBACK_URL });

    expect(result).toEqual({ ok: false, reason: "empty-cart" });
  });

  it("refuses a cart that asks for more than the current Stok", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 1 });

    const result = await orders.placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 2 }] }), {
      callbackUrl: CALLBACK_URL,
    });

    expect(result).toEqual({ ok: false, reason: "cart-changed" });
  });

  it("refuses a cart holding a Variant that is no longer on sale", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });

    const result = await orders.placeOrder(
      checkout({ items: [{ variantId: oil.id, quantity: 1 }, { variantId: 99999, quantity: 1 }] }),
      { callbackUrl: CALLBACK_URL },
    );

    expect(result).toEqual({ ok: false, reason: "cart-changed" });
  });
});

describe("Confirming a payment", () => {
  it("marks the Order Ödendi and takes the sold units off Stok", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const paste = await variantWith({ priceKurus: 12900, stock: 3 });
    const { orderNumber, token } = await placeOrder(
      checkout({ items: [{ variantId: oil.id, quantity: 2 }, { variantId: paste.id, quantity: 1 }] }),
    );
    payments.approve(token);

    const result = await orders.confirmPayment(token);

    expect(result).toMatchObject({ ok: true, order: { orderNumber, status: "paid" } });
    expect((await orders.getOrder(orderNumber))?.paidAt).toBeInstanceOf(Date);
    expect(await stockOf(oil.id)).toBe(3);
    expect(await stockOf(paste.id)).toBe(2);
  });

  it("opens the confirmation page Order by its access token", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    payments.approve(token);
    const result = await orders.confirmPayment(token);
    if (!result.ok) throw new Error("confirmation failed");

    const order = await orders.getOrderByAccessToken(result.order.accessToken);

    expect(order?.orderNumber).toBe(orderNumber);
    expect(await orders.getOrderByAccessToken("not-a-token")).toBeNull();
  });

  it("confirms a repeated notification once, without taking Stok twice", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 2 }] }));
    payments.approve(token);

    const first = await orders.confirmPayment(token);
    const second = await orders.confirmPayment(token);

    expect(first).toMatchObject({ ok: true, order: { orderNumber, status: "paid" } });
    expect(second).toMatchObject({ ok: true, order: { orderNumber, status: "paid" } });
    expect(await stockOf(oil.id)).toBe(3);
  });

  it("leaves Stok alone when the payment is declined, and the Customer can try again", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 1 });
    const items = [{ variantId: oil.id, quantity: 1 }];
    const declined = await placeOrder(checkout({ items }));
    payments.decline(declined.token);

    const result = await orders.confirmPayment(declined.token);

    expect(result).toEqual({ ok: false, reason: "payment-failed" });
    expect(await stockOf(oil.id)).toBe(1);

    const retry = await placeOrder(checkout({ items }));
    payments.approve(retry.token);
    expect(await orders.confirmPayment(retry.token)).toMatchObject({ ok: true, order: { status: "paid" } });
    expect(await stockOf(oil.id)).toBe(0);
  });

  it("keeps a declined Order open, so another card on the provider's page can still pay it", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    payments.decline(token);
    await orders.confirmPayment(token);
    expect((await orders.getOrder(orderNumber))?.status).toBe("awaiting_payment");

    payments.approve(token);

    expect(await orders.confirmPayment(token)).toMatchObject({ ok: true, order: { orderNumber, status: "paid" } });
    expect(await stockOf(oil.id)).toBe(4);
  });

  it("gives back a payment that arrives for an Order already cancelled, once", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    await orders.changeStatus(orderNumber, "cancelled");
    payments.approve(token);

    const first = await orders.confirmPayment(token);
    const again = await orders.confirmPayment(token);

    expect(first).toEqual({ ok: false, reason: "payment-failed" });
    expect(again).toEqual({ ok: false, reason: "payment-failed" });
    expect(payments.cancelledPaymentIds()).toHaveLength(1);
    expect(await stockOf(oil.id)).toBe(5);
  });

  it("keeps the Order open when the payment is still pending, so it can complete later", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));

    const early = await orders.confirmPayment(token);

    expect(early).toEqual({ ok: false, reason: "payment-pending" });
    expect(await stockOf(oil.id)).toBe(5);
    expect((await orders.getOrder(orderNumber))?.status).toBe("awaiting_payment");
    payments.approve(token);
    expect(await orders.confirmPayment(token)).toMatchObject({ ok: true, order: { status: "paid" } });
  });

  it("sells the last unit once when two payments are confirmed at the same time", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 1 });
    const items = [{ variantId: oil.id, quantity: 1 }];
    const first = await placeOrder(checkout({ items }));
    const second = await placeOrder(checkout({ items, email: "mehmet@example.com" }));
    payments.approve(first.token);
    payments.approve(second.token);

    const results = await Promise.all([orders.confirmPayment(first.token), orders.confirmPayment(second.token)]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([{ ok: false, reason: "out-of-stock" }]);
    expect(await stockOf(oil.id)).toBe(0);
    expect(payments.cancelledPaymentIds()).toHaveLength(1);
    const statuses = await Promise.all([first, second].map(async (o) => (await orders.getOrder(o.orderNumber))?.status));
    expect(statuses.sort()).toEqual(["cancelled", "paid"]);
  });

  it("reports the sold-out outcome again on a repeated notification without cancelling twice", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 1 });
    const items = [{ variantId: oil.id, quantity: 1 }];
    const winner = await placeOrder(checkout({ items }));
    const loser = await placeOrder(checkout({ items }));
    payments.approve(winner.token);
    payments.approve(loser.token);
    await orders.confirmPayment(winner.token);

    const once = await orders.confirmPayment(loser.token);
    const again = await orders.confirmPayment(loser.token);

    expect(once).toEqual({ ok: false, reason: "out-of-stock" });
    expect(again).toEqual({ ok: false, reason: "out-of-stock" });
    expect(payments.cancelledPaymentIds()).toHaveLength(1);
  });

  it("still tells the Customer it sold out when the provider can't void the payment", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 1 });
    const items = [{ variantId: oil.id, quantity: 1 }];
    const winner = await placeOrder(checkout({ items }));
    const loser = await placeOrder(checkout({ items }));
    payments.approve(winner.token);
    payments.approve(loser.token);
    await orders.confirmPayment(winner.token);
    payments.refuseCancellations();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await orders.confirmPayment(loser.token);

    expect(result).toEqual({ ok: false, reason: "out-of-stock" });
    expect((await orders.getOrder(loser.orderNumber))?.status).toBe("cancelled");
    expect(errors).toHaveBeenCalledOnce();
    errors.mockRestore();
  });

  it("refuses a payment whose verified amount differs from the Order total, and gives it back", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    payments.approve(token, { amountKurus: 100 });

    const result = await orders.confirmPayment(token);

    expect(result).toEqual({ ok: false, reason: "payment-failed" });
    expect(await stockOf(oil.id)).toBe(5);
    expect((await orders.getOrder(orderNumber))?.status).toBe("cancelled");
    expect(payments.cancelledPaymentIds()).toHaveLength(1);
  });
});

describe("Sipariş Durumu transitions", () => {
  async function paidOrder(): Promise<string> {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    payments.approve(token);
    await orders.confirmPayment(token);
    return orderNumber;
  }

  it("moves a paid Order through Hazırlanıyor, Kargoda, Teslim Edildi and İade", async () => {
    const orderNumber = await paidOrder();

    for (const status of ["preparing", "shipped", "delivered", "returned"] as const) {
      await orders.changeStatus(orderNumber, status, { trackingNumber: "YK1234567890" });
      expect((await orders.getOrder(orderNumber))?.status).toBe(status);
    }
  });

  it("needs a tracking number to move to Kargoda, keeps it on the Order and tells the Customer", async () => {
    const orderNumber = await paidOrder();
    await orders.changeStatus(orderNumber, "preparing");

    await expect(orders.changeStatus(orderNumber, "shipped")).rejects.toThrow(MissingTrackingNumberError);
    await expect(orders.changeStatus(orderNumber, "shipped", { trackingNumber: "   " })).rejects.toThrow(
      MissingTrackingNumberError,
    );
    expect((await orders.getOrder(orderNumber))?.status).toBe("preparing");
    const sentBefore = mail.sent().length;

    await orders.changeStatus(orderNumber, "shipped", { trackingNumber: " YK1234567890 " });

    expect(await orders.getOrder(orderNumber)).toMatchObject({ status: "shipped", trackingNumber: "YK1234567890" });
    expect(mail.sent()).toHaveLength(sentBefore + 1);
    expect(mail.sent().at(-1)).toMatchObject({ to: "ayse@example.com" });
    expect(mail.sent().at(-1)!.text).toContain("YK1234567890");
  });

  it("sends no shipping notice when the move to Kargoda is rejected", async () => {
    const orderNumber = await paidOrder();
    const sentBefore = mail.sent().length;

    await expect(orders.changeStatus(orderNumber, "shipped", { trackingNumber: "YK1" })).rejects.toThrow(
      OrderStatusError,
    );

    expect(mail.sent()).toHaveLength(sentBefore);
  });

  it("rejects skipping a step", async () => {
    const orderNumber = await paidOrder();

    await expect(orders.changeStatus(orderNumber, "shipped")).rejects.toThrow(OrderStatusError);
    await expect(orders.changeStatus(orderNumber, "delivered")).rejects.toThrow(OrderStatusError);
    expect((await orders.getOrder(orderNumber))?.status).toBe("paid");
  });

  it("rejects leaving İptal", async () => {
    const orderNumber = await paidOrder();
    await orders.changeStatus(orderNumber, "cancelled");

    await expect(orders.changeStatus(orderNumber, "preparing")).rejects.toThrow(OrderStatusError);
  });

  it("keeps the Admin's note on an İptal or İade", async () => {
    const cancelled = await paidOrder();
    await orders.changeStatus(cancelled, "cancelled", { note: " Müşteri istedi; iyzico panelinden iade edildi. " });
    const returned = await paidOrder();
    for (const status of ["preparing", "shipped", "returned"] as const) {
      await orders.changeStatus(returned, status, { trackingNumber: "YK1", note: "Ürün hasarlı döndü." });
    }

    expect(await orders.getOrder(cancelled)).toMatchObject({
      status: "cancelled",
      adminNote: "Müşteri istedi; iyzico panelinden iade edildi.",
    });
    expect(await orders.getOrder(returned)).toMatchObject({ status: "returned", adminNote: "Ürün hasarlı döndü." });
  });

  it("lets the Admin cancel an Order before it ships but not after", async () => {
    const early = await paidOrder();
    await orders.changeStatus(early, "preparing");
    await orders.changeStatus(early, "cancelled", { note: "Stok bulunamadı." });
    const late = await paidOrder();
    await orders.changeStatus(late, "preparing");
    await orders.changeStatus(late, "shipped", { trackingNumber: "YK1" });

    await expect(orders.changeStatus(late, "cancelled")).rejects.toThrow(OrderStatusError);
    expect((await orders.getOrder(early))?.status).toBe("cancelled");
    expect((await orders.getOrder(late))?.status).toBe("shipped");
  });

  it("only lets a confirmed payment make an Order Ödendi", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));

    await expect(orders.changeStatus(orderNumber, "paid")).rejects.toThrow(OrderStatusError);
    expect((await orders.getOrder(orderNumber))?.status).toBe("awaiting_payment");
    expect(await stockOf(oil.id)).toBe(5);
  });
});

describe("Listing Orders for the Admin", () => {
  async function orderWithStatus(status: "awaiting_payment" | "paid" | "preparing") {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    if (status === "awaiting_payment") return orderNumber;
    payments.approve(token);
    await orders.confirmPayment(token);
    if (status === "preparing") await orders.changeStatus(orderNumber, "preparing");
    return orderNumber;
  }

  it("lists Orders newest first and can filter by Sipariş Durumu", async () => {
    const waiting = await orderWithStatus("awaiting_payment");
    const paid = await orderWithStatus("paid");
    const preparing = await orderWithStatus("preparing");

    expect((await orders.listOrders()).map((order) => order.orderNumber)).toEqual([preparing, paid, waiting]);
    expect((await orders.listOrders({ status: "paid" })).map((order) => order.orderNumber)).toEqual([paid]);
    expect(await orders.listOrders({ status: "delivered" })).toEqual([]);
  });

  it("summarises each Order with its Customer and total", async () => {
    const orderNumber = await orderWithStatus("paid");

    const [summary] = await orders.listOrders();

    expect(summary).toMatchObject({
      orderNumber,
      status: "paid",
      customerName: "Ayşe Yılmaz",
      email: "ayse@example.com",
      totalKurus: 34950 + 6000,
    });
  });
});

describe("Order e-mails", () => {
  it("sends the Customer a Turkish confirmation with the Order number, lines, total and address once paid", async () => {
    await shipping.setSettings({ shippingFeeKurus: 6000, freeShippingThresholdKurus: 100000 });
    const oil = await variantWith({ priceKurus: 34950, stock: 5, name: "500 ml" });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 2 }] }));
    expect(mail.sent()).toEqual([]);
    payments.approve(token);

    await orders.confirmPayment(token);

    expect(mail.sent()).toHaveLength(1);
    const [email] = mail.sent();
    expect(email.to).toBe("ayse@example.com");
    expect(email.subject).toBe(`Zeytin Evi: ${orderNumber} numaralı siparişiniz alındı`);
    for (const body of [email.text, email.html]) {
      expect(body).toContain(orderNumber);
      expect(body).toContain("Erken Hasat Zeytinyağı 500 ml");
      expect(body).toMatch(/2\s*×/);
      expect(body).toContain("₺699,00");
      expect(body).toContain("₺60,00");
      expect(body).toContain("₺759,00");
      expect(body).toContain("Zeytinalanı Mah. Zeytin Sk. No: 3");
      expect(body).toContain("Urla / İzmir");
      expect(body).toContain("Zeytin Evi");
    }
  });

  it("sends the confirmation once when the provider repeats the notification", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    payments.approve(token);

    await orders.confirmPayment(token);
    await orders.confirmPayment(token);

    expect(mail.sent()).toHaveLength(1);
  });

  it("sends nothing for a declined payment or an Order that sold out before payment", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 1 });
    const items = [{ variantId: oil.id, quantity: 1 }];
    const declined = await placeOrder(checkout({ items }));
    payments.decline(declined.token);
    await orders.confirmPayment(declined.token);
    const first = await placeOrder(checkout({ items }));
    const late = await placeOrder(checkout({ items }));
    payments.approve(first.token);
    payments.approve(late.token);
    await orders.confirmPayment(first.token);
    expect(mail.sent()).toHaveLength(1);

    expect(await orders.confirmPayment(late.token)).toEqual({ ok: false, reason: "out-of-stock" });

    expect(mail.sent().map((email) => email.subject)).toEqual([
      `Zeytin Evi: ${first.orderNumber} numaralı siparişiniz alındı`,
    ]);
  });

  it("keeps the Order Ödendi and logs the error when the confirmation can't be sent", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    payments.approve(token);
    mail.refuseSending();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await orders.confirmPayment(token);

    expect(result).toMatchObject({ ok: true, order: { orderNumber, status: "paid" } });
    expect(await stockOf(oil.id)).toBe(4);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining(orderNumber), expect.any(Error));
    logged.mockRestore();
  });

  it("sends the shipping notice with the tracking number", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5, name: "500 ml" });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    payments.approve(token);
    await orders.confirmPayment(token);
    const emails = createOrderEmails({ sender: mail, brandName: "Zeytin Evi", bankAccount: BANK_ACCOUNT });

    await emails.orderShipped((await orders.getOrder(orderNumber))!, "YK1234567890");

    const shipped = mail.sent().at(-1)!;
    expect(shipped.to).toBe("ayse@example.com");
    expect(shipped.subject).toBe(`Zeytin Evi: ${orderNumber} numaralı siparişiniz kargoya verildi`);
    for (const body of [shipped.text, shipped.html]) {
      expect(body).toContain(orderNumber);
      expect(body).toContain("YK1234567890");
      expect(body).toContain("Erken Hasat Zeytinyağı 500 ml");
      expect(body).toContain("Zeytin Evi");
    }
  });

  it("logs a shipping notice that can't be sent instead of failing", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber, token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    payments.approve(token);
    await orders.confirmPayment(token);
    mail.refuseSending();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const emails = createOrderEmails({ sender: mail, brandName: "Zeytin Evi", bankAccount: BANK_ACCOUNT });

    await expect(emails.orderShipped((await orders.getOrder(orderNumber))!, "YK1234567890")).resolves.toBeUndefined();

    expect(logged).toHaveBeenCalledWith(expect.stringContaining(orderNumber), expect.any(Error));
    logged.mockRestore();
  });

  it("escapes what the Customer typed in the HTML body", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const shippingAddress = { ...checkout().shippingAddress, fullName: "Ayşe <b>Yılmaz</b>" };
    const { token } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }], shippingAddress }));
    payments.approve(token);

    await orders.confirmPayment(token);

    const [email] = mail.sent();
    expect(email.html).toContain("Ayşe &lt;b&gt;Yılmaz&lt;/b&gt;");
    expect(email.html).not.toContain("<b>Yılmaz</b>");
    expect(email.text).toContain("Ayşe <b>Yılmaz</b>");
  });
});

describe("Bank transfer Orders", () => {
  it("places an Ödeme Bekliyor Order without touching Stok or starting a card payment", async () => {
    await shipping.setSettings({ shippingFeeKurus: 6000, freeShippingThresholdKurus: 100000 });
    const oil = await variantWith({ priceKurus: 34950, stock: 5, name: "500 ml" });

    const result = await orders.placeBankTransferOrder(checkout({ items: [{ variantId: oil.id, quantity: 2 }] }));

    if (!result.ok) throw new Error(`placement failed: ${result.reason}`);
    const order = await orders.getOrder(result.orderNumber);
    expect(order).toMatchObject({
      status: "awaiting_payment",
      paymentMethod: "bank_transfer",
      totalKurus: 75900,
      paidAt: null,
    });
    expect(result.accessToken).toBe(order?.accessToken);
    expect(await stockOf(oil.id)).toBe(5);
    expect(payments.session(result.orderNumber)).toBeUndefined();
  });

  it("refuses the same carts and details as a card Order", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 1 });

    expect(await orders.placeBankTransferOrder(checkout({ items: [] }))).toEqual({ ok: false, reason: "empty-cart" });
    expect(await orders.placeBankTransferOrder(checkout({ items: [{ variantId: oil.id, quantity: 2 }] }))).toEqual({
      ok: false,
      reason: "cart-changed",
    });
    expect(
      await orders.placeBankTransferOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }], acceptedContracts: false })),
    ).toEqual({ ok: false, reason: "contracts-not-accepted" });
    expect(await orders.listOrders()).toEqual([]);
  });

  it("marks the Order Ödendi and takes the sold units off Stok when the Admin confirms the transfer", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const paste = await variantWith({ priceKurus: 12900, stock: 3 });
    const placed = await orders.placeBankTransferOrder(
      checkout({ items: [{ variantId: oil.id, quantity: 2 }, { variantId: paste.id, quantity: 1 }] }),
    );
    if (!placed.ok) throw new Error("placement failed");

    const result = await orders.confirmBankTransfer(placed.orderNumber);

    expect(result).toMatchObject({ ok: true, order: { orderNumber: placed.orderNumber, status: "paid" } });
    expect((await orders.getOrder(placed.orderNumber))?.paidAt).toBeInstanceOf(Date);
    expect(await stockOf(oil.id)).toBe(3);
    expect(await stockOf(paste.id)).toBe(2);
  });

  it("warns the Admin and leaves the Order Ödeme Bekliyor, with no Stok taken, when a Variant ran short", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const paste = await variantWith({ priceKurus: 12900, stock: 3, name: "Cam kavanoz" });
    const first = await orders.placeBankTransferOrder(
      checkout({ items: [{ variantId: oil.id, quantity: 2 }, { variantId: paste.id, quantity: 3 }] }),
    );
    const second = await orders.placeBankTransferOrder(checkout({ items: [{ variantId: paste.id, quantity: 1 }] }));
    if (!first.ok || !second.ok) throw new Error("placement failed");
    expect(await orders.confirmBankTransfer(first.orderNumber)).toMatchObject({ ok: true });

    const result = await orders.confirmBankTransfer(second.orderNumber);

    expect(result).toEqual({ ok: false, reason: "insufficient-stock", variantName: "Erken Hasat Zeytinyağı Cam kavanoz" });
    expect((await orders.getOrder(second.orderNumber))?.status).toBe("awaiting_payment");
    expect(await stockOf(paste.id)).toBe(0);
  });

  it("takes no Stok from any line when a later line ran short", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const paste = await variantWith({ priceKurus: 12900, stock: 3 });
    const placed = await orders.placeBankTransferOrder(
      checkout({ items: [{ variantId: oil.id, quantity: 2 }, { variantId: paste.id, quantity: 3 }] }),
    );
    if (!placed.ok) throw new Error("placement failed");
    await testDb.db.execute(sql`update variants set stock = 1 where id = ${paste.id}`);

    const result = await orders.confirmBankTransfer(placed.orderNumber);

    expect(result).toMatchObject({ ok: false, reason: "insufficient-stock" });
    expect(await stockOf(oil.id)).toBe(5);
    expect(await stockOf(paste.id)).toBe(1);
  });

  it("lets the Admin confirm the transfer once Stok is back", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 2 });
    const placed = await orders.placeBankTransferOrder(checkout({ items: [{ variantId: oil.id, quantity: 2 }] }));
    if (!placed.ok) throw new Error("placement failed");
    await testDb.db.execute(sql`update variants set stock = 0 where id = ${oil.id}`);
    expect(await orders.confirmBankTransfer(placed.orderNumber)).toMatchObject({ ok: false });
    await testDb.db.execute(sql`update variants set stock = 4 where id = ${oil.id}`);

    expect(await orders.confirmBankTransfer(placed.orderNumber)).toMatchObject({ ok: true });
    expect(await stockOf(oil.id)).toBe(2);
  });

  it("confirms a transfer once, without taking Stok twice", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const placed = await orders.placeBankTransferOrder(checkout({ items: [{ variantId: oil.id, quantity: 2 }] }));
    if (!placed.ok) throw new Error("placement failed");
    await orders.confirmBankTransfer(placed.orderNumber);

    await expect(orders.confirmBankTransfer(placed.orderNumber)).rejects.toBeInstanceOf(OrderStatusError);
    expect(await stockOf(oil.id)).toBe(3);
  });

  it("only confirms Ödeme Bekliyor bank transfer Orders", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const card = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    const cancelled = await orders.placeBankTransferOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    if (!cancelled.ok) throw new Error("placement failed");
    await orders.changeStatus(cancelled.orderNumber, "cancelled");

    await expect(orders.confirmBankTransfer(card.orderNumber)).rejects.toBeInstanceOf(OrderStatusError);
    await expect(orders.confirmBankTransfer(cancelled.orderNumber)).rejects.toBeInstanceOf(OrderStatusError);
    await expect(orders.confirmBankTransfer("NOSUCHNO")).rejects.toThrow("Order not found");
    expect(await stockOf(oil.id)).toBe(5);
  });

  it("tells the Customer the Order was received, with the bank details, amount and Order number to pay by", async () => {
    await shipping.setSettings({ shippingFeeKurus: 6000, freeShippingThresholdKurus: 100000 });
    const oil = await variantWith({ priceKurus: 34950, stock: 5, name: "500 ml" });

    const placed = await orders.placeBankTransferOrder(checkout({ items: [{ variantId: oil.id, quantity: 2 }] }));

    if (!placed.ok) throw new Error("placement failed");
    expect(mail.sent()).toHaveLength(1);
    const [email] = mail.sent();
    expect(email.to).toBe("ayse@example.com");
    expect(email.subject).toBe(`Zeytin Evi: ${placed.orderNumber} numaralı siparişiniz alındı, ödemeniz bekleniyor`);
    for (const body of [email.text, email.html]) {
      expect(body).toContain(placed.orderNumber);
      expect(body).toContain("Erken Hasat Zeytinyağı 500 ml");
      expect(body).toContain("₺759,00");
      expect(body).toContain("Örnek Bank");
      expect(body).toContain("Zeytin Evi Gıda Ltd. Şti.");
      expect(body).toContain("TR33 0006 1005 1978 6457 8413 26");
      expect(body).toContain("Urla / İzmir");
    }
  });

  it("sends no e-mail for a bank transfer Order that was refused", async () => {
    await orders.placeBankTransferOrder(checkout({ items: [] }));

    expect(mail.sent()).toEqual([]);
  });

  it("sends the payment confirmation once the Admin confirms the transfer, and not again on a failed confirmation", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const placed = await orders.placeBankTransferOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));
    if (!placed.ok) throw new Error("placement failed");
    await testDb.db.execute(sql`update variants set stock = 0 where id = ${oil.id}`);
    await orders.confirmBankTransfer(placed.orderNumber);
    expect(mail.sent()).toHaveLength(1);
    await testDb.db.execute(sql`update variants set stock = 5 where id = ${oil.id}`);

    await orders.confirmBankTransfer(placed.orderNumber);
    await expect(orders.confirmBankTransfer(placed.orderNumber)).rejects.toBeInstanceOf(OrderStatusError);

    expect(mail.sent()).toHaveLength(2);
    expect(mail.sent()[1].text).toContain("Ödemeniz alındı");
  });
});
