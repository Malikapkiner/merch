import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { openTestDatabase } from "../../../tests/database";
import { createShipping, shippingChargeFor } from "./index";

const testDb = openTestDatabase();
const shipping = createShipping(testDb.db);

beforeEach(() => testDb.truncateAll());
afterAll(() => testDb.close());

describe("Shipping charge rule", () => {
  it("charges the flat fee below the free shipping threshold", () => {
    const charge = shippingChargeFor(50000, { shippingFeeKurus: 6000, freeShippingThresholdKurus: 100000 });

    expect(charge.shippingFeeKurus).toBe(6000);
    expect(charge.remainingForFreeShippingKurus).toBe(50000);
  });

  it("drops the fee once the subtotal reaches the threshold", () => {
    const charge = shippingChargeFor(100000, { shippingFeeKurus: 6000, freeShippingThresholdKurus: 100000 });

    expect(charge.shippingFeeKurus).toBe(0);
    expect(charge.remainingForFreeShippingKurus).toBe(0);
  });

  it("keeps shipping free above the threshold", () => {
    const charge = shippingChargeFor(150000, { shippingFeeKurus: 6000, freeShippingThresholdKurus: 100000 });

    expect(charge.shippingFeeKurus).toBe(0);
    expect(charge.remainingForFreeShippingKurus).toBe(0);
  });
});

describe("Shipping settings", () => {
  it("starts from the default fee and threshold", async () => {
    const settings = await shipping.getSettings();

    expect(settings).toEqual({ shippingFeeKurus: 6000, freeShippingThresholdKurus: 100000 });
  });

  it("persists a changed fee and threshold so later reads see them", async () => {
    await shipping.setSettings({ shippingFeeKurus: 2500, freeShippingThresholdKurus: 75000 });

    const settings = await shipping.getSettings();

    expect(settings).toEqual({ shippingFeeKurus: 2500, freeShippingThresholdKurus: 75000 });
  });

  it("overwrites the previous values instead of keeping an old row", async () => {
    await shipping.setSettings({ shippingFeeKurus: 2500, freeShippingThresholdKurus: 75000 });
    await shipping.setSettings({ shippingFeeKurus: 4000, freeShippingThresholdKurus: 200000 });

    const settings = await shipping.getSettings();

    expect(settings).toEqual({ shippingFeeKurus: 4000, freeShippingThresholdKurus: 200000 });
  });

  it("rejects a negative fee or threshold", async () => {
    await expect(shipping.setSettings({ shippingFeeKurus: -1, freeShippingThresholdKurus: 100000 })).rejects.toThrow();
    await expect(shipping.setSettings({ shippingFeeKurus: 6000, freeShippingThresholdKurus: -1 })).rejects.toThrow();
  });
});
