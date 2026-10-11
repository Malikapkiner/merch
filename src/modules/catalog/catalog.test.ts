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

  it("rejects a duplicate slug", async () => {
    await catalog.createProduct({ slug: "salca", name: "Biber Salçası" });

    await expect(catalog.createProduct({ slug: "salca", name: "Başka" })).rejects.toThrow();
  });
});
