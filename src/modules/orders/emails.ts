import type { EmailMessage, EmailSender } from "../notifications";
import type { Address, Order } from "./types";

export type OrderEmailsOptions = {
  sender: EmailSender;
  /** The store's brand name from the app configuration; signs every e-mail. */
  brandName: string;
};

const priceFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

/** 75900 -> "₺759,00" */
function price(kurus: number): string {
  return priceFormatter.format(kurus / 100);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function addressLines(address: Address): string[] {
  return [
    address.fullName,
    `${address.neighbourhood} ${address.addressLine}`,
    `${address.district} / ${address.province}`,
  ];
}

/** One e-mail written once as paragraphs: plain text joins them, HTML escapes and wraps them. */
type Paragraph = string | string[];

function message(to: string, subject: string, paragraphs: Paragraph[], idempotencyKey: string): EmailMessage {
  const lines = (paragraph: Paragraph) => (Array.isArray(paragraph) ? paragraph : [paragraph]);
  return {
    to,
    subject,
    text: paragraphs.map((paragraph) => lines(paragraph).join("\n")).join("\n\n"),
    html: [
      '<div lang="tr" style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #222">',
      ...paragraphs.map((paragraph) => `<p>${lines(paragraph).map(escapeHtml).join("<br>")}</p>`),
      "</div>",
    ].join("\n"),
    idempotencyKey,
  };
}

/**
 * The Customer's Order e-mails, in Turkish and signed with the brand name.
 * Sending never throws: an e-mail is a courtesy on top of an Order that is
 * already settled, so a failed send is logged and the Order goes on.
 */
export function createOrderEmails(options: OrderEmailsOptions) {
  const { sender, brandName } = options;

  async function deliver(order: Order, email: EmailMessage): Promise<void> {
    try {
      await sender.send(email);
    } catch (error) {
      console.error(`E-mail "${email.subject}" for Order ${order.orderNumber} could not be sent.`, error);
    }
  }

  return {
    /** Sipariş onayı, sent once the Order is Ödendi. */
    async orderConfirmed(order: Order): Promise<void> {
      await deliver(
        order,
        message(
          order.email,
          `${brandName}: ${order.orderNumber} numaralı siparişiniz alındı`,
          [
            `Merhaba ${order.shippingAddress.fullName},`,
            "Ödemeniz alındı, siparişiniz için teşekkür ederiz. Siparişinizi hazırlayıp kargoya verdiğimizde size takip numarasıyla birlikte haber vereceğiz.",
            `Sipariş numarası: ${order.orderNumber}`,
            order.lines.map(
              (line) => `${line.productName} ${line.variantName}: ${line.quantity} × ${price(line.unitPriceKurus)} = ${price(line.lineTotalKurus)}`,
            ),
            [
              `Ara toplam: ${price(order.subtotalKurus)}`,
              `Kargo: ${order.shippingFeeKurus === 0 ? "Ücretsiz" : price(order.shippingFeeKurus)}`,
              `Toplam (KDV dahil): ${price(order.totalKurus)}`,
            ],
            ["Teslimat adresi:", ...addressLines(order.shippingAddress), order.phone],
            brandName,
          ],
          `order-confirmed/${order.orderNumber}`,
        ),
      );
    },

    /** Kargoya verildi bildirimi with the tracking number the Admin entered. */
    async orderShipped(order: Order, trackingNumber: string): Promise<void> {
      await deliver(
        order,
        message(
          order.email,
          `${brandName}: ${order.orderNumber} numaralı siparişiniz kargoya verildi`,
          [
            `Merhaba ${order.shippingAddress.fullName},`,
            `${order.orderNumber} numaralı siparişiniz kargoya verildi.`,
            `Kargo takip numarası: ${trackingNumber}`,
            order.lines.map((line) => `${line.productName} ${line.variantName}: ${line.quantity} adet`),
            ["Teslimat adresi:", ...addressLines(order.shippingAddress)],
            brandName,
          ],
          // The tracking number is part of the key, so a corrected number still reaches the Customer.
          `order-shipped/${order.orderNumber}/${trackingNumber}`,
        ),
      );
    },
  };
}

export type OrderEmails = ReturnType<typeof createOrderEmails>;
