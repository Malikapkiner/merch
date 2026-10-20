import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { openTestDatabase } from "../../../tests/database";
import { createCatalog } from "../catalog";
import { createFakePaymentProvider } from "../payment";
import type { FakePaymentProvider } from "../payment";
import { createShipping } from "../shipping";
import type { CheckoutInput } from "./index";
import { createOrders, OrderStatusError } from "./index";

const testDb = openTestDatabase();
const catalog = createCatalog(testDb.db);
const shipping = createShipping(testDb.db);
let payments: FakePaymentProvider;
let orders: ReturnType<typeof createOrders>;

const CALLBACK_URL = "https://magaza.test/odeme/sonuc";

beforeEach(async () => {
  await testDb.truncateAll();
  payments = createFakePaymentProvider();
  orders = createOrders(testDb.db, { payments });
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
    expect((await orders.getOrder(declined.orderNumber))?.status).toBe("cancelled");

    const retry = await placeOrder(checkout({ items }));
    payments.approve(retry.token);
    expect(await orders.confirmPayment(retry.token)).toMatchObject({ ok: true, order: { status: "paid" } });
    expect(await stockOf(oil.id)).toBe(0);
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
      await orders.changeStatus(orderNumber, status);
      expect((await orders.getOrder(orderNumber))?.status).toBe(status);
    }
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

  it("only lets a confirmed payment make an Order Ödendi", async () => {
    const oil = await variantWith({ priceKurus: 34950, stock: 5 });
    const { orderNumber } = await placeOrder(checkout({ items: [{ variantId: oil.id, quantity: 1 }] }));

    await expect(orders.changeStatus(orderNumber, "paid")).rejects.toThrow(OrderStatusError);
    expect((await orders.getOrder(orderNumber))?.status).toBe("awaiting_payment");
    expect(await stockOf(oil.id)).toBe(5);
  });
});
