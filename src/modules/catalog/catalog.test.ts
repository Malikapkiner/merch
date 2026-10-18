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

  it("shows the Admin every product, including unpublished ones", async () => {
    await catalog.createProduct({ slug: "yayinda", name: "Yayında" });
    await catalog.createProduct({ slug: "taslak", name: "Taslak", published: false });

    const products = await catalog.listProductsForAdmin();

    expect(products.map((p) => p.slug)).toEqual(["yayinda", "taslak"]);
  });

  it("hides a product from the storefront once the Admin unpublishes it", async () => {
    const product = await catalog.createProduct({ slug: "salca", name: "Biber Salçası" });

    await catalog.updateProduct(product.id, { published: false });

    expect(await catalog.getProduct("salca")).toBeNull();
    expect((await catalog.listProducts()).map((p) => p.slug)).toEqual([]);
  });

  it("reflects an edited product name on the storefront", async () => {
    const product = await catalog.createProduct({ slug: "salca", name: "Biber Salçası" });

    await catalog.updateProduct(product.id, { name: "Acı Biber Salçası" });

    expect((await catalog.getProduct("salca"))?.name).toBe("Acı Biber Salçası");
  });

  it("reflects an edited variant price and KDV rate on the storefront", async () => {
    const product = await catalog.createProduct({ slug: "salca", name: "Biber Salçası" });
    await catalog.addVariant(product.id, { name: "700 g", priceKurus: 22900, vatRatePercent: 1, stock: 4 });
    const [variant] = (await catalog.getProductForAdmin(product.id))!.variants;

    await catalog.updateVariant(variant.id, { priceKurus: 24900, vatRatePercent: 10 });

    const [storefrontVariant] = (await catalog.getProduct("salca"))!.variants;
    expect(storefrontVariant).toMatchObject({ priceKurus: 24900, vatRatePercent: 10 });
  });

  it("marks a variant sold out on the storefront when the Admin sets Stok to zero", async () => {
    const product = await catalog.createProduct({ slug: "salca", name: "Biber Salçası" });
    await catalog.addVariant(product.id, { name: "700 g", priceKurus: 22900, vatRatePercent: 1, stock: 4 });
    const [variant] = (await catalog.getProductForAdmin(product.id))!.variants;

    await catalog.setStock(variant.id, 0);

    expect((await catalog.getProduct("salca"))!.variants[0].soldOut).toBe(true);
  });

  it("restocks a sold-out variant", async () => {
    const product = await catalog.createProduct({ slug: "salca", name: "Biber Salçası" });
    await catalog.addVariant(product.id, { name: "700 g", priceKurus: 22900, vatRatePercent: 1, stock: 0 });
    const [variant] = (await catalog.getProductForAdmin(product.id))!.variants;

    await catalog.setStock(variant.id, 12);

    expect((await catalog.getProduct("salca"))!.variants[0].soldOut).toBe(false);
  });

  it("rejects a negative Stok or price", async () => {
    const product = await catalog.createProduct({ slug: "salca", name: "Biber Salçası" });
    await catalog.addVariant(product.id, { name: "700 g", priceKurus: 22900, vatRatePercent: 1, stock: 1 });
    const [variant] = (await catalog.getProductForAdmin(product.id))!.variants;

    await expect(catalog.setStock(variant.id, -1)).rejects.toThrow();
    await expect(catalog.updateVariant(variant.id, { stock: -1 })).rejects.toThrow();
    await expect(catalog.updateVariant(variant.id, { priceKurus: -5 })).rejects.toThrow();
  });

  it("returns cart variants with their product context for the given ids", async () => {
    const product = await catalog.createProduct({ slug: "erken-hasat", name: "Erken Hasat" });
    await catalog.addVariant(product.id, { name: "500 ml", priceKurus: 34950, vatRatePercent: 10, stock: 4 });
    const [variant] = (await catalog.getProductForAdmin(product.id))!.variants;

    const variants = await catalog.getVariantsByIds([variant.id]);

    expect(variants).toEqual([
      {
        id: variant.id,
        name: "500 ml",
        productSlug: "erken-hasat",
        productName: "Erken Hasat",
        priceKurus: 34950,
        stock: 4,
      },
    ]);
  });

  it("omits the variants of an unpublished product from the cart read", async () => {
    const product = await catalog.createProduct({ slug: "taslak", name: "Taslak", published: false });
    await catalog.addVariant(product.id, { name: "500 ml", priceKurus: 34950, vatRatePercent: 10, stock: 4 });
    const [variant] = (await catalog.getProductForAdmin(product.id))!.variants;

    expect(await catalog.getVariantsByIds([variant.id])).toEqual([]);
  });

  it("returns no cart variants for an empty id list", async () => {
    expect(await catalog.getVariantsByIds([])).toEqual([]);
  });
});
