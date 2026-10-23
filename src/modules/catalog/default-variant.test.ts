import { describe, expect, it } from "vitest";
import { pickDefaultVariant } from "./default-variant";

const variant = (id: number, priceKurus: number, stock: number, position = id) => ({
  id,
  name: `v${id}`,
  priceKurus,
  stock,
  position,
});

describe("pickDefaultVariant", () => {
  it("picks the cheapest Variant that is in stock", () => {
    expect(pickDefaultVariant([variant(1, 30000, 5), variant(2, 12000, 3)])).toEqual({
      id: 2,
      name: "v2",
      priceKurus: 12000,
    });
  });

  it("skips a cheaper Variant that is sold out", () => {
    expect(pickDefaultVariant([variant(1, 12000, 0), variant(2, 30000, 4)])?.id).toBe(2);
  });

  it("breaks price ties by position", () => {
    expect(pickDefaultVariant([variant(1, 12000, 2, 5), variant(2, 12000, 2, 1)])?.id).toBe(2);
  });

  it("is null when every Variant is sold out or there are none", () => {
    expect(pickDefaultVariant([variant(1, 12000, 0)])).toBeNull();
    expect(pickDefaultVariant([])).toBeNull();
  });
});
