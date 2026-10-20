import { afterAll, describe, expect, it } from "vitest";
import { openTestDatabase } from "../../tests/database";
import { checkHealth } from "./health";

const { db, close } = openTestDatabase();
afterAll(close);

describe("checkHealth", () => {
  it("is healthy when the database answers", async () => {
    expect(await checkHealth(db)).toEqual({ ok: true });
  });

  it("is unhealthy, without leaking the cause, when the database fails", async () => {
    const broken = { execute: () => Promise.reject(new Error("password=secret")) } as unknown as typeof db;
    expect(await checkHealth(broken)).toEqual({ ok: false });
  });
});
