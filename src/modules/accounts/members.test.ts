import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { openTestDatabase } from "../../../tests/database";
import { createFakeEmailSender } from "../notifications";
import { createAccounts, createMembers, SESSION_TTL_MS } from "./index";

const testDb = openTestDatabase();

beforeEach(() => testDb.truncateAll());
afterAll(() => testDb.close());

const PASSWORD = "dogru-sifre-123";
const EMAIL = "ayse@ornek.com";

describe("Members: registration and login", () => {
  it("registers a Member and logs them in with e-posta and password", async () => {
    const members = createMembers(testDb.db);

    const registered = await members.register({ email: "  Ayse@Ornek.com ", password: PASSWORD });
    expect(registered).toEqual({ ok: true, member: { id: expect.any(Number), email: EMAIL } });

    const login = await members.login({ email: EMAIL.toUpperCase(), password: PASSWORD });
    expect(login.ok).toBe(true);
  });

  it("rejects a second registration with the same e-posta", async () => {
    const members = createMembers(testDb.db);
    await members.register({ email: EMAIL, password: PASSWORD });

    expect(await members.register({ email: "AYSE@ornek.com", password: "baska-sifre-456" })).toEqual({
      ok: false,
      reason: "email-taken",
    });
  });

  it("rejects an invalid e-posta and a too-short password", async () => {
    const members = createMembers(testDb.db);

    expect(await members.register({ email: "ayse", password: PASSWORD })).toEqual({ ok: false, reason: "invalid-email" });
    expect(await members.register({ email: EMAIL, password: "kisa" })).toEqual({ ok: false, reason: "weak-password" });
  });

  it("rejects a wrong password and an unknown e-posta the same way", async () => {
    const members = createMembers(testDb.db);
    await members.register({ email: EMAIL, password: PASSWORD });

    const invalid = { ok: false, reason: "invalid-credentials" };
    expect(await members.login({ email: EMAIL, password: "yanlis-sifre" })).toEqual(invalid);
    expect(await members.login({ email: "yok@ornek.com", password: PASSWORD })).toEqual(invalid);
  });

  it("authenticates the Member behind a session token until logout or expiry", async () => {
    let now = new Date("2026-01-01T00:00:00.000Z");
    const members = createMembers(testDb.db, { now: () => now });
    const registered = await members.register({ email: EMAIL, password: PASSWORD });
    if (!registered.ok) throw new Error("expected registration");
    const login = await members.login({ email: EMAIL, password: PASSWORD });
    if (!login.ok) throw new Error("expected login");

    expect(await members.verifySession(login.token)).toEqual(registered.member);
    expect(await members.verifySession("uydurma")).toBeNull();

    now = new Date(now.getTime() + SESSION_TTL_MS + 1000);
    expect(await members.verifySession(login.token)).toBeNull();

    now = new Date("2026-01-01T00:00:00.000Z");
    await members.logout(login.token);
    expect(await members.verifySession(login.token)).toBeNull();
  });

  it("blocks login after repeated failures, even with the right password, until the window passes", async () => {
    let now = new Date("2026-01-01T00:00:00.000Z");
    const members = createMembers(testDb.db, { now: () => now });
    await members.register({ email: EMAIL, password: PASSWORD });

    for (let i = 0; i < 5; i++) await members.login({ email: EMAIL, password: "yanlis" });

    expect(await members.login({ email: EMAIL, password: PASSWORD })).toEqual({ ok: false, reason: "rate-limited" });

    now = new Date(now.getTime() + 16 * 60 * 1000);
    expect((await members.login({ email: EMAIL, password: PASSWORD })).ok).toBe(true);
  });

  it("keeps Member and Admin login attempts separate", async () => {
    const accounts = createAccounts(testDb.db);
    await accounts.createAdmin({ email: EMAIL, password: PASSWORD });
    const members = createMembers(testDb.db);
    await members.register({ email: EMAIL, password: "uye-sifresi-123" });

    for (let i = 0; i < 5; i++) await accounts.login({ email: EMAIL, password: "yanlis" });

    expect((await members.login({ email: EMAIL, password: "uye-sifresi-123" })).ok).toBe(true);
  });
});

describe("Members: password reset", () => {
  const RESET_URL = (token: string) => `https://magaza.test/sifre-sifirla/${token}`;

  function setup(startAt = "2026-01-01T00:00:00.000Z") {
    const clock = { now: new Date(startAt) };
    const mail = createFakeEmailSender();
    const members = createMembers(testDb.db, { now: () => clock.now, sender: mail, brandName: "Zeytin Evi" });
    return { clock, mail, members };
  }

  /** The token from the link in the latest reset e-mail. */
  function tokenFrom(mail: ReturnType<typeof createFakeEmailSender>): string {
    const message = mail.sent().at(-1)!;
    return message.text.match(/sifre-sifirla\/([\w-]+)/)![1];
  }

  it("e-mails a reset link to a registered Member and lets them set a new password", async () => {
    const { mail, members } = setup();
    await members.register({ email: EMAIL, password: PASSWORD });

    await members.requestPasswordReset(EMAIL, { resetUrl: RESET_URL });

    expect(mail.sent()).toHaveLength(1);
    expect(mail.sent()[0].to).toBe(EMAIL);
    const result = await members.resetPassword({ token: tokenFrom(mail), password: "yeni-sifre-456" });
    expect(result).toEqual({ ok: true });
    expect((await members.login({ email: EMAIL, password: "yeni-sifre-456" })).ok).toBe(true);
    expect((await members.login({ email: EMAIL, password: PASSWORD })).ok).toBe(false);
  });

  it("sends nothing and reveals nothing for an unknown e-posta", async () => {
    const { mail, members } = setup();

    await expect(members.requestPasswordReset("yok@ornek.com", { resetUrl: RESET_URL })).resolves.toBeUndefined();

    expect(mail.sent()).toHaveLength(0);
  });

  it("accepts a reset link only once", async () => {
    const { mail, members } = setup();
    await members.register({ email: EMAIL, password: PASSWORD });
    await members.requestPasswordReset(EMAIL, { resetUrl: RESET_URL });
    const token = tokenFrom(mail);

    await members.resetPassword({ token, password: "yeni-sifre-456" });

    expect(await members.resetPassword({ token, password: "baska-sifre-789" })).toEqual({ ok: false, reason: "invalid-token" });
    expect((await members.login({ email: EMAIL, password: "baska-sifre-789" })).ok).toBe(false);
  });

  it("rejects an expired link and an invented one", async () => {
    const { clock, mail, members } = setup();
    await members.register({ email: EMAIL, password: PASSWORD });
    await members.requestPasswordReset(EMAIL, { resetUrl: RESET_URL });
    const token = tokenFrom(mail);

    clock.now = new Date(clock.now.getTime() + 61 * 60 * 1000);

    expect(await members.resetPassword({ token, password: "yeni-sifre-456" })).toEqual({ ok: false, reason: "invalid-token" });
    expect(await members.resetPassword({ token: "uydurma", password: "yeni-sifre-456" })).toEqual({ ok: false, reason: "invalid-token" });
  });

  it("keeps the link usable when the new password is too weak", async () => {
    const { mail, members } = setup();
    await members.register({ email: EMAIL, password: PASSWORD });
    await members.requestPasswordReset(EMAIL, { resetUrl: RESET_URL });
    const token = tokenFrom(mail);

    expect(await members.resetPassword({ token, password: "kisa" })).toEqual({ ok: false, reason: "weak-password" });

    expect(await members.resetPassword({ token, password: "yeni-sifre-456" })).toEqual({ ok: true });
  });

  it("signs the Member out everywhere and voids older links when the password changes", async () => {
    const { mail, members } = setup();
    await members.register({ email: EMAIL, password: PASSWORD });
    const login = await members.login({ email: EMAIL, password: PASSWORD });
    if (!login.ok) throw new Error("expected login");
    await members.requestPasswordReset(EMAIL, { resetUrl: RESET_URL });
    const older = tokenFrom(mail);
    await members.requestPasswordReset(EMAIL, { resetUrl: RESET_URL });
    const newer = tokenFrom(mail);

    await members.resetPassword({ token: newer, password: "yeni-sifre-456" });

    expect(await members.verifySession(login.token)).toBeNull();
    expect(await members.resetPassword({ token: older, password: "baska-sifre-789" })).toEqual({ ok: false, reason: "invalid-token" });
  });

  it("rate limits reset requests per e-posta", async () => {
    const { clock, mail, members } = setup();
    await members.register({ email: EMAIL, password: PASSWORD });

    for (let i = 0; i < 5; i++) await members.requestPasswordReset(EMAIL, { resetUrl: RESET_URL });
    expect(mail.sent()).toHaveLength(3);

    clock.now = new Date(clock.now.getTime() + 61 * 60 * 1000);
    await members.requestPasswordReset(EMAIL, { resetUrl: RESET_URL });
    expect(mail.sent()).toHaveLength(4);
  });
});

describe("Members: saved addresses", () => {
  const HOME = {
    fullName: "Ayşe Yılmaz",
    phone: "0532 123 45 67",
    province: "İzmir",
    district: "Urla",
    neighbourhood: "Zeytinalanı Mah.",
    addressLine: "Zeytin Sk. No: 3",
  };

  async function registered(email = EMAIL) {
    const members = createMembers(testDb.db);
    const result = await members.register({ email, password: PASSWORD });
    if (!result.ok) throw new Error("expected registration");
    return { members, id: result.member.id };
  }

  it("saves, lists, edits and deletes a Member's addresses", async () => {
    const { members, id } = await registered();

    const saved = await members.saveAddress(id, HOME);
    if (!saved.ok) throw new Error("expected save");
    expect(saved.address).toEqual({ ...HOME, id: expect.any(Number), phone: "+905321234567" });
    expect(await members.listAddresses(id)).toEqual([saved.address]);

    const edited = await members.saveAddress(id, { ...HOME, addressLine: "Zeytin Sk. No: 5" }, saved.address.id);
    expect(edited).toEqual({ ok: true, address: { ...saved.address, addressLine: "Zeytin Sk. No: 5" } });
    expect((await members.listAddresses(id))[0].addressLine).toBe("Zeytin Sk. No: 5");

    await members.deleteAddress(id, saved.address.id);
    expect(await members.listAddresses(id)).toEqual([]);
  });

  it("lists addresses oldest first", async () => {
    const { members, id } = await registered();
    await members.saveAddress(id, HOME);
    await members.saveAddress(id, { ...HOME, fullName: "İş adresi" });

    expect((await members.listAddresses(id)).map((address) => address.fullName)).toEqual(["Ayşe Yılmaz", "İş adresi"]);
  });

  it("names every invalid field and saves nothing", async () => {
    const { members, id } = await registered();

    const result = await members.saveAddress(id, { ...HOME, phone: "123", district: "Atlantis", addressLine: " " });

    expect(result).toEqual({ ok: false, fields: ["phone", "district", "addressLine"] });
    expect(await members.listAddresses(id)).toEqual([]);
  });

  it("never lets a Member read, edit or delete another Member's address", async () => {
    const { members, id } = await registered();
    const other = await registered("baska@ornek.com");
    const saved = await members.saveAddress(id, HOME);
    if (!saved.ok) throw new Error("expected save");

    expect(await other.members.listAddresses(other.id)).toEqual([]);
    expect(await other.members.saveAddress(other.id, HOME, saved.address.id)).toEqual({ ok: false, fields: [] });
    await other.members.deleteAddress(other.id, saved.address.id);

    expect(await members.listAddresses(id)).toEqual([saved.address]);
  });
});
