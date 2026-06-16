import { expect, test, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return new Request("https://example.com/api/ai", {
    method: "POST",
    headers,
  }) as unknown as NextRequest;
}

// ── Graceful no-op (THE critical constraint) ──────────────────────────────────
//
// @vercel/firewall returns { rateLimited: false } when NODE_ENV !== "production"
// (local dev / CI / test suite). This is the SDK's built-in behavior.
// Additionally our helper wraps each call in try/catch, so errors also no-op.
// This test proves the suite NEVER gets blocked in local/CI runs.

test("checkAiRateLimit returns { limited: false } in local/test env (graceful no-op)", async () => {
  const { checkAiRateLimit } = await import("./ai-ratelimit");
  const result = await checkAiRateLimit(makeReq({ "x-forwarded-for": "1.2.3.4" }));
  expect(result.limited).toBe(false);
  expect(result.reason).toBeUndefined();
});

test("checkAiRateLimit returns { limited: false } even if checkRateLimit throws", async () => {
  // Belt-and-suspenders: if the SDK throws unexpectedly, we allow the request.
  vi.doMock("@vercel/firewall", () => ({
    checkRateLimit: vi.fn().mockRejectedValue(new Error("firewall unavailable")),
  }));
  const { checkAiRateLimit } = await import("./ai-ratelimit");
  const result = await checkAiRateLimit(makeReq());
  expect(result.limited).toBe(false);
  expect(result.reason).toBeUndefined();
});

// ── Limited cases ─────────────────────────────────────────────────────────────

test("returns { limited: true, reason: 'client' } when per-IP rule fires", async () => {
  vi.doMock("@vercel/firewall", () => ({
    checkRateLimit: vi
      .fn()
      .mockResolvedValueOnce({ rateLimited: true }), // per-IP → limited
  }));
  const { checkAiRateLimit } = await import("./ai-ratelimit");
  const result = await checkAiRateLimit(makeReq({ "x-forwarded-for": "1.2.3.4" }));
  expect(result.limited).toBe(true);
  expect(result.reason).toBe("client");
});

test("returns { limited: true, reason: 'global' } when global rule fires (per-IP passes)", async () => {
  vi.doMock("@vercel/firewall", () => ({
    checkRateLimit: vi
      .fn()
      .mockResolvedValueOnce({ rateLimited: false }) // per-IP → ok
      .mockResolvedValueOnce({ rateLimited: true }),  // global → limited
  }));
  const { checkAiRateLimit } = await import("./ai-ratelimit");
  const result = await checkAiRateLimit(makeReq());
  expect(result.limited).toBe(true);
  expect(result.reason).toBe("global");
});

test("returns { limited: false } when both rules pass", async () => {
  vi.doMock("@vercel/firewall", () => ({
    checkRateLimit: vi
      .fn()
      .mockResolvedValueOnce({ rateLimited: false }) // per-IP → ok
      .mockResolvedValueOnce({ rateLimited: false }), // global → ok
  }));
  const { checkAiRateLimit } = await import("./ai-ratelimit");
  const result = await checkAiRateLimit(makeReq({ "x-forwarded-for": "5.6.7.8" }));
  expect(result.limited).toBe(false);
  expect(result.reason).toBeUndefined();
});

test("global check is skipped when per-IP is already limited (short-circuit)", async () => {
  const mockCheckRateLimit = vi
    .fn()
    .mockResolvedValueOnce({ rateLimited: true }); // per-IP → limited
  vi.doMock("@vercel/firewall", () => ({
    checkRateLimit: mockCheckRateLimit,
  }));
  const { checkAiRateLimit } = await import("./ai-ratelimit");
  await checkAiRateLimit(makeReq({ "x-forwarded-for": "1.2.3.4" }));
  // Only called once (per-IP), not twice (global is skipped)
  expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
});
