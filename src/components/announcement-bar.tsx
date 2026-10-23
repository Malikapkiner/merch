import { formatPrice } from "@/lib/format-price";

/** Thin strip above the header announcing the Ücretsiz Kargo Eşiği. */
export function AnnouncementBar({ freeShippingThresholdKurus }: { freeShippingThresholdKurus: number | null }) {
  if (freeShippingThresholdKurus === null || freeShippingThresholdKurus <= 0) return null;
  return (
    <div className="announcement-bar">
      <p className="container">{formatPrice(freeShippingThresholdKurus)} ve üzeri siparişlerde ücretsiz kargo</p>
    </div>
  );
}
