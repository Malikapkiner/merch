import { siteConfig } from "@/config/site";
import { getDb } from "@/db";
import { createMembers } from "@/modules/accounts";
import { emailSender } from "./email";

/** Members bound to the app database and e-mail sender; created per call so builds don't need DATABASE_URL. */
export const getMembers = () => createMembers(getDb(), { sender: emailSender(), brandName: siteConfig.brandName });
