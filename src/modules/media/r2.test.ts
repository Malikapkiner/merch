import { describe, expect, it } from "vitest";
import { createMediaStorageFromEnv } from "./index";

function fullR2Env(): Record<string, string> {
  return {
    R2_ACCOUNT_ID: "abc123",
    R2_BUCKET: "merch-media",
    R2_ACCESS_KEY_ID: "r2-key",
    R2_SECRET_ACCESS_KEY: "r2-secret",
    R2_PUBLIC_BASE_URL: "https://cdn.example.com/media",
  };
}

describe("Media storage configuration", () => {
  it("builds the R2 adapter from the full R2 configuration", () => {
    const storage = createMediaStorageFromEnv(fullR2Env());
    expect(storage?.publicUrl("products/1/kapak.png")).toBe("https://cdn.example.com/media/products/1/kapak.png");
  });

  it("leaves media storage unconfigured when no R2 variable is set", () => {
    expect(createMediaStorageFromEnv({})).toBeUndefined();
  });

  it("rejects a partially configured R2 setup by naming the missing variables", () => {
    const env = fullR2Env();
    delete env.R2_SECRET_ACCESS_KEY;
    expect(() => createMediaStorageFromEnv(env)).toThrow(/R2_SECRET_ACCESS_KEY/);
  });

  it("rejects a partially configured R2 setup by naming every missing variable", () => {
    const env = fullR2Env();
    delete env.R2_BUCKET;
    delete env.R2_PUBLIC_BASE_URL;
    expect(() => createMediaStorageFromEnv(env)).toThrow(/R2_BUCKET, R2_PUBLIC_BASE_URL/);
  });
});
