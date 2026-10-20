// Public interface of the Notifications module. Import only from here.
export { createFakeEmailSender } from "./email";
export type { EmailMessage, EmailSender, FakeEmailSender } from "./email";
export { createResendEmailSender, createResendEmailSenderFromEnv, ResendError } from "./resend";
export type { ResendConfig } from "./resend";
