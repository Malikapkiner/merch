import { getDb } from "@/db";
import { createAccounts } from "@/modules/accounts";

/** Accounts bound to the app database; created per call so builds don't need DATABASE_URL. */
export const getAccounts = () => createAccounts(getDb());
