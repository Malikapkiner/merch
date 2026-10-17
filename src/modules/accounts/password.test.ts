import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

/**
 * Password hashing is a security primitive, not a collaborator: a direct test is the only
 * way to assert the stored value is an unscrambled-by-nobody hash rather than the plaintext.
 */
describe("password hashing", () => {
  it("stores a hash that verifies the original password", async () => {
    const hash = await hashPassword("dogru-sifre-123");

    expect(hash).not.toContain("dogru-sifre-123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("dogru-sifre-123", hash)).toBe(true);
  });

  it("does not verify a wrong password", async () => {
    const hash = await hashPassword("dogru-sifre-123");

    expect(await verifyPassword("yanlis-sifre", hash)).toBe(false);
  });

  it("salts so the same password hashes differently", async () => {
    const first = await hashPassword("dogru-sifre-123");
    const second = await hashPassword("dogru-sifre-123");

    expect(first).not.toBe(second);
  });

  it("does not verify against a malformed stored hash", async () => {
    expect(await verifyPassword("dogru-sifre-123", "bozuk-veri")).toBe(false);
  });
});
