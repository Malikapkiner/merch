import { index, pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  /** Lower-cased; login is case-insensitive. */
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  /** SHA-256 of the session token; the raw token only ever lives in the cookie. */
  tokenHash: text("token_hash").notNull().unique(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

/** Failed login attempts, used to rate limit brute-force guessing per e-posta. */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
  },
  (table) => [index("login_attempts_email_idx").on(table.email)],
);

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  /** Lower-cased; login is case-insensitive. */
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memberSessions = pgTable("member_sessions", {
  id: serial("id").primaryKey(),
  /** SHA-256 of the session token; the raw token only ever lives in the cookie. */
  tokenHash: text("token_hash").notNull().unique(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

/** One-time password reset links; only the SHA-256 of the token is stored. */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
});

export const memberAddresses = pgTable("member_addresses", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  province: text("province").notNull(),
  district: text("district").notNull(),
  neighbourhood: text("neighbourhood").notNull(),
  addressLine: text("address_line").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
