import { eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { shippingSettings } from "./schema";

export type ShippingSettings = {
  /** Flat shipping fee in kuruş (Kargo Ücreti), charged below the free shipping threshold. */
  shippingFeeKurus: number;
  /** Subtotal in kuruş at or above which shipping is free (Ücretsiz Kargo Eşiği). */
  freeShippingThresholdKurus: number;
};

export type ShippingCharge = {
  shippingFeeKurus: number;
  /** How much the subtotal still needs to reach before shipping is free; 0 once reached. */
  remainingForFreeShippingKurus: number;
};

/** No fee and nothing left to reach free shipping. */
export const NO_SHIPPING_CHARGE: ShippingCharge = {
  shippingFeeKurus: 0,
  remainingForFreeShippingKurus: 0,
};

/** Used until the Admin saves their own values from the panel. */
const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  shippingFeeKurus: 6000,
  freeShippingThresholdKurus: 100000,
};

/** The flat fee (Kargo Ücreti) and free shipping rule applied to a subtotal (kuruş). */
export function shippingChargeFor(subtotalKurus: number, settings: ShippingSettings): ShippingCharge {
  if (subtotalKurus >= settings.freeShippingThresholdKurus) return NO_SHIPPING_CHARGE;
  return {
    shippingFeeKurus: settings.shippingFeeKurus,
    remainingForFreeShippingKurus: settings.freeShippingThresholdKurus - subtotalKurus,
  };
}

/** The single settings row always lives at this id. */
const SETTINGS_ID = 1;

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

/**
 * Shipping module: the configurable flat fee (Kargo Ücreti) and free shipping
 * threshold (Ücretsiz Kargo Eşiği). The Admin edits them from the panel; readers
 * apply `shippingChargeFor` to a subtotal. Tracking numbers (ticket 11) join
 * this module later.
 */
export function createShipping(db: Database) {
  return {
    /** The current fee and threshold, or the built-in defaults before the Admin saves. */
    async getSettings(): Promise<ShippingSettings> {
      const [row] = await db
        .select({
          shippingFeeKurus: shippingSettings.shippingFeeKurus,
          freeShippingThresholdKurus: shippingSettings.freeShippingThresholdKurus,
        })
        .from(shippingSettings)
        .where(eq(shippingSettings.id, SETTINGS_ID));
      return row ?? DEFAULT_SHIPPING_SETTINGS;
    },

    /** Saves the fee and threshold; takes effect on the next read. */
    async setSettings(input: ShippingSettings): Promise<void> {
      assertNonNegativeInteger(input.shippingFeeKurus, "shippingFeeKurus");
      assertNonNegativeInteger(input.freeShippingThresholdKurus, "freeShippingThresholdKurus");
      await db
        .insert(shippingSettings)
        .values({ id: SETTINGS_ID, ...input })
        .onConflictDoUpdate({
          target: shippingSettings.id,
          set: { ...input, updatedAt: new Date() },
        });
    },
  };
}

export type Shipping = ReturnType<typeof createShipping>;
