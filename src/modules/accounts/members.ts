import { randomBytes } from "node:crypto";
import { and, asc, count, eq, gt, isNull, lt } from "drizzle-orm";
import type { Database } from "@/db/client";
import { SESSION_TTL_MS, type LoginResult } from "./accounts";
import { isKnownDistrict, isKnownProvince, normalizePhone } from "../address";
import type { EmailSender } from "../notifications";
import { hashPassword, verifyPassword } from "./password";
import { loginAttempts, memberAddresses, memberSessions, members, passwordResetTokens } from "./schema";
import { EMAIL_PATTERN, hashToken, MIN_PASSWORD_LENGTH, normalizeEmail } from "./shared";

/** An authenticated Member. Never carries credentials. */
export type Member = { id: number; email: string };

export type RegisterResult =
  | { ok: true; member: Member }
  | { ok: false; reason: "invalid-email" | "weak-password" | "email-taken" };

export type ResetPasswordResult = { ok: true } | { ok: false; reason: "invalid-token" | "weak-password" };

/** A saved delivery address; `phone` is stored as E.164, e.g. +905321234567. */
export type MemberAddress = {
  id: number;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  neighbourhood: string;
  addressLine: string;
};

export type MemberAddressInput = Omit<MemberAddress, "id">;

export type MemberAddressField = keyof MemberAddressInput;

export type SaveAddressResult =
  | { ok: true; address: MemberAddress }
  /** Invalid fields in form order; empty when the address to edit is not the Member's. */
  | { ok: false; fields: MemberAddressField[] };

const MAX_TEXT_LENGTH = 300;
const isFilled = (value: string) => value.length > 0 && value.length <= MAX_TEXT_LENGTH;

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_RESET_REQUESTS_PER_HOUR = 3;
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
/** Member attempts share the login_attempts table with Admin; the prefix keeps the counters apart. */
const attemptKey = (email: string) => `member:${email}`;

function toAddress(row: typeof memberAddresses.$inferSelect): MemberAddress {
  const { id, fullName, phone, province, district, neighbourhood, addressLine } = row;
  return { id, fullName, phone, province, district, neighbourhood, addressLine };
}

/**
 * Members: e-posta and password accounts for Müşteriler who want saved addresses
 * and an Order history. Credentials in, sessions out; hashing and storage stay inside.
 */
export function createMembers(
  db: Database,
  options: { now?: () => Date; sender?: EmailSender; brandName?: string } = {},
) {
  const now = options.now ?? (() => new Date());
  const brandName = options.brandName ?? "Mağaza";

  // Hashed once per process so an unknown e-posta costs the same as a wrong password.
  let dummyHash: Promise<string> | undefined;
  const dummyPasswordHash = () => (dummyHash ??= hashPassword(randomBytes(24).toString("hex")));

  return {
    async register(input: { email: string; password: string }): Promise<RegisterResult> {
      const email = normalizeEmail(input.email);
      if (!EMAIL_PATTERN.test(email)) return { ok: false, reason: "invalid-email" };
      if (input.password.length < MIN_PASSWORD_LENGTH) return { ok: false, reason: "weak-password" };

      const [row] = await db
        .insert(members)
        .values({ email, passwordHash: await hashPassword(input.password) })
        .onConflictDoNothing({ target: members.email })
        .returning({ id: members.id, email: members.email });
      return row ? { ok: true, member: row } : { ok: false, reason: "email-taken" };
    },

    /** Verifies credentials and, on success, issues a session token. */
    async login(input: { email: string; password: string }): Promise<LoginResult> {
      const email = normalizeEmail(input.email);
      const key = attemptKey(email);
      const startedAt = now();
      const windowStart = new Date(startedAt.getTime() - ATTEMPT_WINDOW_MS);

      return db.transaction(async (tx) => {
        // Lock the account row so concurrent attempts cannot each read an under-threshold count.
        const [account] = await tx
          .select({ id: members.id, passwordHash: members.passwordHash })
          .from(members)
          .where(eq(members.email, email))
          .for("update");

        await tx.delete(loginAttempts).where(and(eq(loginAttempts.email, key), lt(loginAttempts.attemptedAt, windowStart)));
        const recentFailures = await tx
          .select({ id: loginAttempts.id })
          .from(loginAttempts)
          .where(and(eq(loginAttempts.email, key), gt(loginAttempts.attemptedAt, windowStart)));
        if (recentFailures.length >= MAX_FAILED_ATTEMPTS) return { ok: false, reason: "rate-limited" };

        const valid = await verifyPassword(input.password, account?.passwordHash ?? (await dummyPasswordHash()));
        if (!account || !valid) {
          await tx.insert(loginAttempts).values({ email: key, attemptedAt: startedAt });
          return { ok: false, reason: "invalid-credentials" };
        }

        await tx.delete(loginAttempts).where(eq(loginAttempts.email, key));
        const token = randomBytes(32).toString("base64url");
        const expiresAt = new Date(startedAt.getTime() + SESSION_TTL_MS);
        await tx.insert(memberSessions).values({
          tokenHash: hashToken(token),
          memberId: account.id,
          createdAt: startedAt,
          expiresAt,
        });
        return { ok: true, token, expiresAt };
      });
    },

    /** The Member behind a session token, or null when unknown or expired. */
    async verifySession(token: string): Promise<Member | null> {
      if (!token) return null;
      const [row] = await db
        .select({ id: members.id, email: members.email })
        .from(memberSessions)
        .innerJoin(members, eq(memberSessions.memberId, members.id))
        .where(and(eq(memberSessions.tokenHash, hashToken(token)), gt(memberSessions.expiresAt, now())))
        .orderBy(asc(memberSessions.id))
        .limit(1);
      return row ?? null;
    },

    /**
     * E-mails a one-hour, single-use reset link to a registered Member. Gives the same
     * answer for unknown e-postas and when the hourly request limit is hit, so it never
     * reveals who has an account.
     */
    async requestPasswordReset(emailInput: string, link: { resetUrl: (token: string) => string }): Promise<void> {
      const email = normalizeEmail(emailInput);
      const [member] = await db.select({ id: members.id }).from(members).where(eq(members.email, email));
      if (!member) return;

      const requestedAt = now();
      const [{ recent }] = await db
        .select({ recent: count() })
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.memberId, member.id),
            gt(passwordResetTokens.createdAt, new Date(requestedAt.getTime() - RESET_TOKEN_TTL_MS)),
          ),
        );
      if (recent >= MAX_RESET_REQUESTS_PER_HOUR) return;

      const token = randomBytes(32).toString("base64url");
      await db.insert(passwordResetTokens).values({
        tokenHash: hashToken(token),
        memberId: member.id,
        createdAt: requestedAt,
        expiresAt: new Date(requestedAt.getTime() + RESET_TOKEN_TTL_MS),
      });

      const url = link.resetUrl(token);
      try {
        await options.sender?.send({
          to: email,
          subject: `${brandName} şifre sıfırlama`,
          text: `Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın. Bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir.\n\n${url}\n\nBu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.`,
          html: `<p>Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın. Bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir.</p><p><a href="${url}">${url}</a></p><p>Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>`,
        });
      } catch (error) {
        // Surfacing the failure would reveal that the account exists.
        console.error(`Password reset e-mail to member ${member.id} failed`, error);
      }
    },

    /** Sets a new password through a reset link; the link is spent and every session ends. */
    async resetPassword(input: { token: string; password: string }): Promise<ResetPasswordResult> {
      if (input.password.length < MIN_PASSWORD_LENGTH) return { ok: false, reason: "weak-password" };
      const passwordHash = await hashPassword(input.password);
      const tokenHash = hashToken(input.token);
      const at = now();

      return db.transaction(async (tx): Promise<ResetPasswordResult> => {
        const [spent] = await tx
          .update(passwordResetTokens)
          .set({ usedAt: at })
          .where(
            and(
              eq(passwordResetTokens.tokenHash, tokenHash),
              isNull(passwordResetTokens.usedAt),
              gt(passwordResetTokens.expiresAt, at),
            ),
          )
          .returning({ memberId: passwordResetTokens.memberId });
        if (!spent) return { ok: false, reason: "invalid-token" };

        await tx.update(members).set({ passwordHash }).where(eq(members.id, spent.memberId));
        await tx.delete(memberSessions).where(eq(memberSessions.memberId, spent.memberId));
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.memberId, spent.memberId));
        return { ok: true };
      });
    },

    async listAddresses(memberId: number): Promise<MemberAddress[]> {
      const rows = await db
        .select()
        .from(memberAddresses)
        .where(eq(memberAddresses.memberId, memberId))
        .orderBy(asc(memberAddresses.id));
      return rows.map(toAddress);
    },

    /** Adds an address, or edits `addressId` when it belongs to the Member. */
    async saveAddress(memberId: number, input: MemberAddressInput, addressId?: number): Promise<SaveAddressResult> {
      const phone = normalizePhone(input.phone);
      const trimmed = {
        fullName: input.fullName.trim(),
        province: input.province.trim(),
        district: input.district.trim(),
        neighbourhood: input.neighbourhood.trim(),
        addressLine: input.addressLine.trim(),
      };
      const checks: [MemberAddressField, boolean][] = [
        ["fullName", isFilled(trimmed.fullName)],
        ["phone", phone !== null],
        ["province", isKnownProvince(trimmed.province)],
        ["district", isKnownDistrict(trimmed.province, trimmed.district)],
        ["neighbourhood", isFilled(trimmed.neighbourhood)],
        ["addressLine", isFilled(trimmed.addressLine)],
      ];
      const invalid = checks.filter(([, valid]) => !valid).map(([field]) => field);
      if (invalid.length > 0 || phone === null) return { ok: false, fields: invalid };

      const values = { ...trimmed, phone };
      if (addressId === undefined) {
        const [row] = await db.insert(memberAddresses).values({ memberId, ...values }).returning();
        return { ok: true, address: toAddress(row) };
      }
      const [row] = await db
        .update(memberAddresses)
        .set(values)
        .where(and(eq(memberAddresses.id, addressId), eq(memberAddresses.memberId, memberId)))
        .returning();
      return row ? { ok: true, address: toAddress(row) } : { ok: false, fields: [] };
    },

    async deleteAddress(memberId: number, addressId: number): Promise<void> {
      await db
        .delete(memberAddresses)
        .where(and(eq(memberAddresses.id, addressId), eq(memberAddresses.memberId, memberId)));
    },

    async logout(token: string): Promise<void> {
      if (!token) return;
      await db.delete(memberSessions).where(eq(memberSessions.tokenHash, hashToken(token)));
    },
  };
}

export type Members = ReturnType<typeof createMembers>;
