import { migrate } from "drizzle-orm/node-postgres/migrator";
import { openTestDatabase } from "../tests/database";
import { createCatalog } from "../src/modules/catalog";

/** A clean test database with one purchasable Product. */
export default async function setup() {
  const { db, close, truncateAll } = openTestDatabase();
  await migrate(db, { migrationsFolder: "./drizzle" });
  await truncateAll();

  const catalog = createCatalog(db);
  const category = await catalog.createCategory({ slug: "zeytinyagi", name: "Zeytinyağı" });
  const product = await catalog.createProduct({
    slug: "erken-hasat-zeytinyagi",
    name: "Erken Hasat Zeytinyağı",
    description: "Soğuk sıkım naturel sızma zeytinyağı.",
    categoryId: category.id,
  });
  await catalog.addVariant(product.id, { name: "500 ml cam şişe", priceKurus: 34950, vatRatePercent: 10, stock: 5 });
  await close();
}
