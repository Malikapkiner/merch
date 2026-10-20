import { getDb } from "@/db";
import { createOrders } from "@/modules/orders";
import { paymentProvider } from "./payments";

/** Orders bound to the app database and payment provider; created per call so builds don't need DATABASE_URL. */
export const getOrders = () => createOrders(getDb(), { payments: paymentProvider() });
