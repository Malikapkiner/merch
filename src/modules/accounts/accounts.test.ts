import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { openTestDatabase } from "../../../tests/database";
import { createAccounts, SESSION_TTL_MS } from "./index";

const testDb = openTestDatabase();

beforeEach(() => testDb.truncateAll());
afterAll(() => testDb.close());

const PASSWORD = "dogru-sifre-123";
const EMAIL = "admin@ornek.com";

async function tokenFor(accounts: ReturnType<typeof createAccounts>): Promise<string> {
  const result = await accounts.login({ email: EMAIL, password: PASSWORD });
  if (!result.ok) throw new Error("expected a successful login");
  return result.token;
}

describe("Accounts", () => {
  it("logs in an admin with the correct e-posta and password", async () => {
    const accounts = createAccounts(testDb.db);
    await accounts.createAdmin({ email: EMAIL, password: PASSWORD });

    const result = await accounts.login({ email: EMAIL, password: PASSWORD });

    expect(result.ok).toBe(true);
  });

  it("rejects a wrong password without revealing the account exists", async () => {
    const accounts = createAccounts(testDb.db);
    await accounts.createAdmin({ email: EMAIL, password: PASSWORD });

    expect(await accounts.login({ email: EMAIL, password: "yanlis-sifre" })).toEqual({
      ok: false,
      reason: "invalid-credentials",
    });
  });

  it("rejects an unknown e-posta", async () => {
    const accounts = createAccounts(testDb.db);

    expect(await accounts.login({ email: "yok@ornek.com", password: PASSWORD })).toEqual({
      ok: false,
      reason: "invalid-credentials",
    });
  });

  it("does not return the password hash from the interface", async () => {
    const accounts = createAccounts(testDb.db);

    const admin = await accounts.createAdmin({ email: EMAIL, password: PASSWORD });

    expect(admin).toEqual({ id: expect.any(Number), email: EMAIL });
  });

  it("authenticates the admin behind a session token and rejects unknown tokens", async () => {
    const accounts = createAccounts(testDb.db);
    const admin = await accounts.createAdmin({ email: EMAIL, password: PASSWORD });
    const token = await tokenFor(accounts);

    expect(await accounts.verifySession(token)).toEqual(admin);
    expect(await accounts.verifySession("uydurma-token")).toBeNull();
  });

  it("invalidates a session on logout", async () => {
    const accounts = createAccounts(testDb.db);
    await accounts.createAdmin({ email: EMAIL, password: PASSWORD });
    const token = await tokenFor(accounts);

    await accounts.logout(token);

    expect(await accounts.verifySession(token)).toBeNull();
  });

  it("rejects an expired session", async () => {
    let now = new Date("2026-01-01T00:00:00.000Z");
    const accounts = createAccounts(testDb.db, { now: () => now });
    await accounts.createAdmin({ email: EMAIL, password: PASSWORD });
    const token = await tokenFor(accounts);

    now = new Date(now.getTime() + SESSION_TTL_MS + 1_000);

    expect(await accounts.verifySession(token)).toBeNull();
  });

  it("rate limits repeated failed attempts, even with the correct password", async () => {
    const accounts = createAccounts(testDb.db);
    await accounts.createAdmin({ email: EMAIL, password: PASSWORD });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await accounts.login({ email: EMAIL, password: "yanlis-sifre" });
    }

    expect(await accounts.login({ email: EMAIL, password: PASSWORD })).toEqual({
      ok: false,
      reason: "rate-limited",
    });
  });

  it("forgets failures older than the rate-limit window", async () => {
    let now = new Date("2026-01-01T00:00:00.000Z");
    const accounts = createAccounts(testDb.db, { now: () => now });
    await accounts.createAdmin({ email: EMAIL, password: PASSWORD });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await accounts.login({ email: EMAIL, password: "yanlis-sifre" });
    }

    now = new Date(now.getTime() + 16 * 60 * 1000);

    expect((await accounts.login({ email: EMAIL, password: PASSWORD })).ok).toBe(true);
  });

  it("clears failures after a successful login", async () => {
    const accounts = createAccounts(testDb.db);
    await accounts.createAdmin({ email: EMAIL, password: PASSWORD });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await accounts.login({ email: EMAIL, password: "yanlis-sifre" });
    }
    await accounts.login({ email: EMAIL, password: PASSWORD });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await accounts.login({ email: EMAIL, password: "yanlis-sifre" });
    }

    expect((await accounts.login({ email: EMAIL, password: PASSWORD })).ok).toBe(true);
  });

  it("logs in case-insensitively on the e-posta", async () => {
    const accounts = createAccounts(testDb.db);
    await accounts.createAdmin({ email: EMAIL, password: PASSWORD });

    expect((await accounts.login({ email: "Admin@Ornek.com", password: PASSWORD })).ok).toBe(true);
  });

  it("rejects a duplicate e-posta", async () => {
    const accounts = createAccounts(testDb.db);
    await accounts.createAdmin({ email: EMAIL, password: PASSWORD });

    await expect(accounts.createAdmin({ email: EMAIL, password: PASSWORD })).rejects.toThrow();
  });

  it("rejects a password shorter than 8 characters", async () => {
    const accounts = createAccounts(testDb.db);

    await expect(accounts.createAdmin({ email: EMAIL, password: "kisa" })).rejects.toThrow();
  });
});
