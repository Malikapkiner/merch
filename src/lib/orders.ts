import { siteConfig } from "@/config/site";
import { getDb } from "@/db";
import { createOrderEmails, createOrders } from "@/modules/orders";
import { emailSender } from "./email";
import { paymentProvider } from "./payments";

/** Orders bound to the app database, payment provider and e-mail sender; created per call so builds don't need DATABASE_URL. */
export const getOrders = () =>
  createOrders(getDb(), {
    payments: paymentProvider(),
    emails: createOrderEmails({ sender: emailSender(), brandName: siteConfig.brandName }),
  });
