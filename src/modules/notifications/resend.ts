import type { EmailSender } from "./email";

export type ResendConfig = {
  apiKey: string;
  /** The sender, e.g. "Merch <siparis@example.com>"; its domain must be verified in Resend. */
  from: string;
  /** Injectable for tests; the global fetch otherwise. */
  fetch?: typeof globalThis.fetch;
};

/** A message Resend didn't accept. Carries only Resend's status and error, never the message itself. */
export class ResendError extends Error {
  constructor(
    readonly status: number,
    readonly errorName: string | undefined,
    errorMessage: string | undefined,
  ) {
    super(`Resend refused the e-mail (${status}${errorName ? ` ${errorName}` : ""}): ${errorMessage ?? "no message"}`);
  }
}

const SEND_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 15_000;

/** Sends e-mail through Resend's HTTP API. */
export function createResendEmailSender(config: ResendConfig): EmailSender {
  const fetch = config.fetch ?? globalThis.fetch;
  return {
    async send(message) {
      const response = await fetch(SEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from: config.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) return;
      const body: { name?: unknown; message?: unknown } | null = await response.json().catch(() => null);
      throw new ResendError(
        response.status,
        typeof body?.name === "string" ? body.name : undefined,
        typeof body?.message === "string" ? body.message : undefined,
      );
    },
  };
}

const RESEND_VARIABLES = ["RESEND_API_KEY", "EMAIL_FROM"] as const;

/**
 * Resend bound to RESEND_API_KEY and EMAIL_FROM; undefined when neither is set.
 * A partial configuration throws, naming what's missing.
 */
export function createResendEmailSenderFromEnv(
  variables: Record<string, string | undefined>,
): EmailSender | undefined {
  const values = RESEND_VARIABLES.map((name) => variables[name]);
  if (values.every((value) => !value)) return undefined;
  const missing = RESEND_VARIABLES.filter((_, index) => !values[index]);
  if (missing.length > 0) {
    throw new Error(`Resend is missing required variables: ${missing.join(", ")}`);
  }
  const [apiKey, from] = values as [string, string];
  return createResendEmailSender({ apiKey, from });
}
