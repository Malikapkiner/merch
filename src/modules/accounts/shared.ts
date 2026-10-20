import { createHash } from "node:crypto";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** SHA-256 of a session or reset token; the raw token only ever lives in the cookie or e-mail link. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const MIN_PASSWORD_LENGTH = 8;
