// E-mail port. The Store sends transactional e-mails (Sipariş onayı, kargo
// bildirimi) through an EmailSender; Resend is the real adapter, tests use the fake.

export type EmailMessage = {
  to: string;
  subject: string;
  /** Plain-text body, for clients that don't render HTML. */
  text: string;
  html: string;
  /** Stops the provider from delivering the same message twice when a send is retried. */
  idempotencyKey?: string;
};

export type EmailSender = {
  /** Rejects when the message could not be handed to the provider. */
  send(message: EmailMessage): Promise<void>;
};

/** In-memory sender for tests and local development. */
export type FakeEmailSender = EmailSender & {
  sent(): EmailMessage[];
  /** Makes every later send fail, like a provider outage. */
  refuseSending(): void;
};

export function createFakeEmailSender(): FakeEmailSender {
  const sent: EmailMessage[] = [];
  let refusing = false;
  return {
    async send(message) {
      if (refusing) throw new Error("Fake e-mail sender refused the message");
      sent.push(message);
    },
    sent() {
      return sent;
    },
    refuseSending() {
      refusing = true;
    },
  };
}
