// @vitest-environment node
// jose's `instanceof Uint8Array` key check fails under the global jsdom
// environment (jsdom typed arrays live in a different realm); run in node.
import { describe, it, expect, beforeAll } from "vitest";
import { issueSession, readSession } from "./session";

beforeAll(() => { process.env.SESSION_SECRET = "test-secret-test-secret-test-secret"; });

describe("session", () => {
  it("round-trips an address", async () => {
    const t = await issueSession("0xABC");
    expect(await readSession(t)).toBe("0xabc");
  });
  it("rejects a tampered/empty token", async () => {
    expect(await readSession("garbage")).toBeNull();
    expect(await readSession(undefined)).toBeNull();
  });
  it("refuses to issue a session in production without a real SESSION_SECRET", async () => {
    const prevSecret = process.env.SESSION_SECRET;
    const prevEnv = process.env.NODE_ENV;
    try {
      // NODE_ENV is readonly in the types; assign through a cast.
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.SESSION_SECRET;
      await expect(issueSession("0xABC")).rejects.toThrow(/SESSION_SECRET/);
      process.env.SESSION_SECRET = "dev-only-insecure-secret-change-me";
      await expect(issueSession("0xABC")).rejects.toThrow(/SESSION_SECRET/);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
      process.env.SESSION_SECRET = prevSecret;
    }
  });
});
