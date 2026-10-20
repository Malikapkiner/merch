import { createResendEmailSenderFromEnv } from "@/modules/notifications";
import type { EmailSender } from "@/modules/notifications";

/** A sender that fails every message, so each lost e-mail is logged against its Order. */
function failingSender(reason: string): EmailSender {
  return {
    async send() {
      throw new Error(reason);
    },
  };
}

/** Prints e-mails to the server log instead of sending them, for local development. */
const consoleSender: EmailSender = {
  async send(message) {
    console.info(`[e-posta] ${message.to}: ${message.subject}\n\n${message.text}`);
  },
};

/**
 * The e-mail sender bound to the app configuration: Resend once RESEND_API_KEY
 * and EMAIL_FROM are set; otherwise the server log outside production. A
 * missing or partial configuration never blocks an Order: its e-mails fail and
 * are logged instead.
 */
export function emailSender(): EmailSender {
  try {
    const resend = createResendEmailSenderFromEnv(process.env);
    if (resend) return resend;
  } catch (error) {
    return failingSender(error instanceof Error ? error.message : String(error));
  }
  if (process.env.NODE_ENV !== "production") return consoleSender;
  return failingSender("No e-mail sender is configured; set RESEND_API_KEY and EMAIL_FROM");
}
