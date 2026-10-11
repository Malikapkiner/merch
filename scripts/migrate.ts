import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "../src/db/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const { db, close } = createDatabase(url);
await migrate(db, { migrationsFolder: "./drizzle" });
await close();
console.log("migrations applied");
