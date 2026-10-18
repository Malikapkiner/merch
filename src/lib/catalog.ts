import { getDb } from "@/db";
import { createCatalog } from "@/modules/catalog";
import { mediaStorage } from "@/lib/media";

/** Catalog bound to the app database and media storage; created per call so builds don't need the database. */
export const getCatalog = () => createCatalog(getDb(), { storage: mediaStorage() });
