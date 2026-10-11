import { createDatabase, type Database } from "./client";

let shared: Database | undefined;

/** Lazily-created app database; modules receive it via their factory, never import it. */
export function getDb(): Database {
  if (!shared) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    shared = createDatabase(url).db;
  }
  return shared;
}

export type { Database };
