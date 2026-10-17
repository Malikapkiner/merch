import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gt, lt } from "drizzle-orm";
import type { Database } from "@/db/client";
import { hashPassword, verifyPassword } from "./password";
import { adminSessions, admins, loginAttempts } from "./schema";

/** An authenticated Admin. Never carries credentials. */
export type Admin = { id: number; email: string };

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; reason: "invalid-credentials" | "rate-limited" };

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Accounts module: Admin authentication. Members (ticket 13) will join the same module.
 * The public interface exposes credentials in, sessions out; hashing and storage stay inside.
 */
export function createAccounts(db: Database, options: { now?: () => Date } = {}) {
  const now = options.now ?? (() => new Date());

  // Hashed once per process so an unknown e-posta costs the same as a wrong password,
  // instead of leaking which addresses are registered through response timing.
  let dummyHash: Promise<string> | undefined;
  const dummyPasswordHash = () => (dummyHash ??= hashPassword(randomBytes(24).toString("hex")));

  return {
    async createAdmin(input: { email: string; password: string }): Promise<Admin> {
      const email = normalizeEmail(input.email);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("invalid email");
      if (input.password.length < 8) throw new Error("password must be at least 8 characters");

      const [row] = await db
        .insert(admins)
        .values({ email, passwordHash: await hashPassword(input.password) })
        .returning({ id: admins.id, email: admins.email });
      return row;
    },

    async findAdminByEmail(email: string): Promise<Admin | null> {
      const [row] = await db
        .select({ id: admins.id, email: admins.email })
        .from(admins)
        .where(eq(admins.email, normalizeEmail(email)));
      return row ?? null;
    },

    /** Verifies credentials and, on success, issues a session token. */
    async login(input: { email: string; password: string }): Promise<LoginResult> {
      const email = normalizeEmail(input.email);
      const startedAt = now();
      const windowStart = new Date(startedAt.getTime() - ATTEMPT_WINDOW_MS);

      return db.transaction(async (tx) => {
        // Lock the account row so concurrent attempts against the same e-posta cannot each
        // read the same under-threshold count and slip past the limit.
        const [account] = await tx
          .select({ id: admins.id, email: admins.email, passwordHash: admins.passwordHash })
          .from(admins)
          .where(eq(admins.email, email))
          .for("update");

        await tx
          .delete(loginAttempts)
          .where(and(eq(loginAttempts.email, email), lt(loginAttempts.attemptedAt, windowStart)));

        const recentFailures = await tx
          .select({ id: loginAttempts.id })
          .from(loginAttempts)
          .where(and(eq(loginAttempts.email, email), gt(loginAttempts.attemptedAt, windowStart)));
        if (recentFailures.length >= MAX_FAILED_ATTEMPTS) {
          return { ok: false, reason: "rate-limited" };
        }

        const valid = await verifyPassword(input.password, account?.passwordHash ?? (await dummyPasswordHash()));
        if (!account || !valid) {
          await tx.insert(loginAttempts).values({ email, attemptedAt: startedAt });
          return { ok: false, reason: "invalid-credentials" };
        }

        await tx.delete(loginAttempts).where(eq(loginAttempts.email, email));

        const token = randomBytes(32).toString("base64url");
        const expiresAt = new Date(startedAt.getTime() + SESSION_TTL_MS);
        await tx.insert(adminSessions).values({
          tokenHash: hashToken(token),
          adminId: account.id,
          createdAt: startedAt,
          expiresAt,
        });
        return { ok: true, token, expiresAt };
      });
    },

    /** The Admin behind a session token, or null when unknown or expired. */
    async verifySession(token: string): Promise<Admin | null> {
      if (!token) return null;
      const [row] = await db
        .select({ id: admins.id, email: admins.email })
        .from(adminSessions)
        .innerJoin(admins, eq(adminSessions.adminId, admins.id))
        .where(and(eq(adminSessions.tokenHash, hashToken(token)), gt(adminSessions.expiresAt, now())))
        .orderBy(asc(adminSessions.id))
        .limit(1);
      return row ?? null;
    },

    async logout(token: string): Promise<void> {
      if (!token) return;
      await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
    },
  };
}

export type Accounts = ReturnType<typeof createAccounts>;
