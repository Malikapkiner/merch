import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { openTestDatabase } from "../../../tests/database";
import { createCatalog } from "./index";

const testDb = openTestDatabase();
const catalog = createCatalog(testDb.db);

beforeEach(() => testDb.truncateAll());
afterAll(() => testDb.close());

describe("Catalog", () => {
  it("lists created products in creation order", async () => {
    await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat Zeytinyağı" });
    await catalog.createProduct({ slug: "salca", name: "Biber Salçası" });

    const products = await catalog.listProducts();

    expect(products.map((p) => p.slug)).toEqual(["erken-hasat", "salca"]);
  });

  it("filters listed products by category slug", async () => {
    const oil = await catalog.createCategory({ slug: "zeytinyagi", name: "Zeytinyağı" });
    const paste = await catalog.createCategory({ slug: "salca", name: "Salça" });
    await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat", categoryId: oil.id });
    await catalog.createProduct({ slug: "biber-salcasi", name: "Biber Salçası", categoryId: paste.id });

    const products = await catalog.listProducts({ categorySlug: "zeytinyagi" });

    expect(products.map((p) => p.slug)).toEqual(["erken-hasat"]);
  });

  it("hides unpublished products from the listing", async () => {
    await catalog.createProduct({ slug: "yayinda", name: "Yayında" });
    await catalog.createProduct({ slug: "taslak", name: "Taslak", published: false });

    const products = await catalog.listProducts();

    expect(products.map((p) => p.slug)).toEqual(["yayinda"]);
  });

  it("shows the lowest variant price as the listing price", async () => {
    const oil = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });
    await catalog.addVariant(oil.id, { name: "2 L", priceKurus: 99900, vatRatePercent: 10, stock: 5 });
    await catalog.addVariant(oil.id, { name: "500 ml", priceKurus: 34950, vatRatePercent: 10, stock: 5 });

    const [product] = await catalog.listProducts();

    expect(product.fromPriceKurus).toBe(34950);
  });

  it("returns a product detail with variants, integer kuruş prices and a separate KDV rate", async () => {
    const category = await catalog.createCategory({ slug: "zeytinyagi", name: "Zeytinyağı" });
    const oil = await catalog.createProduct({
      slug: "erken-hasat",
      name: "Erken Hasat",
      description: "Soğuk sıkım.",
      categoryId: category.id,
    });
    await catalog.addVariant(oil.id, { name: "500 ml", priceKurus: 34950, vatRatePercent: 10, stock: 3 });
    await catalog.addVariant(oil.id, { name: "2 L", priceKurus: 99900, vatRatePercent: 10, stock: 1 });

    const detail = await catalog.getProduct("erken-hasat");

    expect(detail).toMatchObject({
      slug: "erken-hasat",
      name: "Erken Hasat",
      description: "Soğuk sıkım.",
      category: { slug: "zeytinyagi" },
    });
    expect(detail?.variants).toEqual([
      expect.objectContaining({ name: "500 ml", priceKurus: 34950, vatRatePercent: 10 }),
      expect.objectContaining({ name: "2 L", priceKurus: 99900, vatRatePercent: 10 }),
    ]);
  });

  it("marks a variant with zero stock as sold out", async () => {
    const oil = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });
    await catalog.addVariant(oil.id, { name: "500 ml", priceKurus: 34950, vatRatePercent: 10, stock: 0 });
    await catalog.addVariant(oil.id, { name: "2 L", priceKurus: 99900, vatRatePercent: 10, stock: 2 });

    const detail = await catalog.getProduct("erken-hasat");

    expect(detail?.variants.map((v) => [v.name, v.soldOut])).toEqual([
      ["500 ml", true],
      ["2 L", false],
    ]);
  });

  it("does not return an unpublished or unknown product", async () => {
    await catalog.createProduct({ slug: "taslak", name: "Taslak", published: false });

    expect(await catalog.getProduct("taslak")).toBeNull();
    expect(await catalog.getProduct("yok")).toBeNull();
  });

  it("rejects a duplicate slug", async () => {
    await catalog.createProduct({ slug: "salca", name: "Biber Salçası" });

    await expect(catalog.createProduct({ slug: "salca", name: "Başka" })).rejects.toThrow();
  });
});
