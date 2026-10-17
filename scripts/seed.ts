import { createDatabase } from "../src/db/client";
import { createAccounts } from "../src/modules/accounts";
import { createCatalog } from "../src/modules/catalog";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const { db, close } = createDatabase(url);
const catalog = createCatalog(db);
const accounts = createAccounts(db);

if ((await catalog.listProducts()).length > 0) {
  console.log("catalog already has products; skipping seed");
} else {
  const oil = await catalog.createCategory({ slug: "zeytinyagi", name: "Zeytinyağı" });
  const olives = await catalog.createCategory({ slug: "zeytin", name: "Zeytin" });
  const paste = await catalog.createCategory({ slug: "salca", name: "Salça" });

  const early = await catalog.createProduct({
    slug: "erken-hasat-zeytinyagi",
    name: "Erken Hasat Zeytinyağı",
    description: "Ekim ayında toplanan zeytinlerden soğuk sıkım, naturel sızma zeytinyağı.",
    categoryId: oil.id,
  });
  await catalog.addVariant(early.id, { name: "500 ml cam şişe", priceKurus: 34950, vatRatePercent: 10, stock: 40 });
  await catalog.addVariant(early.id, { name: "2 L teneke", priceKurus: 119900, vatRatePercent: 10, stock: 15 });
  await catalog.addVariant(early.id, { name: "5 L teneke", priceKurus: 269900, vatRatePercent: 10, stock: 0 });

  const black = await catalog.createProduct({
    slug: "gemlik-sofralik-zeytin",
    name: "Gemlik Sofralık Zeytin",
    description: "Doğal fermantasyonla olgunlaştırılmış, sele usulü Gemlik zeytini.",
    categoryId: olives.id,
  });
  await catalog.addVariant(black.id, { name: "500 g kavanoz", priceKurus: 14900, vatRatePercent: 10, stock: 30 });
  await catalog.addVariant(black.id, { name: "1 kg kavanoz", priceKurus: 27900, vatRatePercent: 10, stock: 20 });

  const pepper = await catalog.createProduct({
    slug: "biber-salcasi",
    name: "Biber Salçası",
    description: "Güneşte kurutulmuş acı ve tatlı biberlerden, katkısız.",
    categoryId: paste.id,
  });
  await catalog.addVariant(pepper.id, { name: "370 g kavanoz", priceKurus: 12900, vatRatePercent: 1, stock: 50 });
  await catalog.addVariant(pepper.id, { name: "700 g kavanoz", priceKurus: 22900, vatRatePercent: 1, stock: 25 });
  console.log("seeded sample catalog");
}

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminEmail || !adminPassword) {
  console.log("ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin creation");
} else if (await accounts.findAdminByEmail(adminEmail)) {
  console.log(`admin ${adminEmail} already exists; skipping`);
} else {
  await accounts.createAdmin({ email: adminEmail, password: adminPassword });
  console.log(`created admin ${adminEmail}`);
}

await close();
