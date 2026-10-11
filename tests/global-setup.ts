import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "../src/db/client";
import { testDatabaseUrl } from "./database";

export default async function setup() {
  const { db, close } = createDatabase(testDatabaseUrl());
  await migrate(db, { migrationsFolder: "./drizzle" });
  await close();
}
