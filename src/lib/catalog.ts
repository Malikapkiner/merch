import { getDb } from "@/db";
import { createCatalog } from "@/modules/catalog";

/** Catalog bound to the app database; created per call so builds don't need DATABASE_URL. */
export const getCatalog = () => createCatalog(getDb());
