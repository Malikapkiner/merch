import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

type Scrypt = (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const scrypt = promisify(scryptCallback) as Scrypt;

/**
 * scrypt is a memory-hard, currently-recommended password KDF and ships with Node,
 * so no native dependency is needed in the Alpine standalone image. Params are stored
 * alongside each hash so they can be raised later without invalidating old passwords.
 */
const PARAMS = { N: 32768, r: 8, p: 1, keylen: 64, maxmem: 128 * 32768 * 8 * 2 } as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, PARAMS.keylen, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !expected) return false;

  const expectedKey = Buffer.from(expected, "base64url");
  const key = await scrypt(password, Buffer.from(salt, "base64url"), expectedKey.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: PARAMS.maxmem,
  });
  return key.length === expectedKey.length && timingSafeEqual(key, expectedKey);
}
