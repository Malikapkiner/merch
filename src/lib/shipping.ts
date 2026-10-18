import { getDb } from "@/db";
import { createShipping } from "@/modules/shipping";

/** Shipping bound to the app database; created per call so builds don't need DATABASE_URL. */
export const getShipping = () => createShipping(getDb());
