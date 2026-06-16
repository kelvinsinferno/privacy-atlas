import { describe, it, expect, vi, afterEach } from "vitest";
import { AllowGate, PassportGate, getGate } from "./sybil-gate";

afterEach(() => vi.restoreAllMocks());

describe("AllowGate", () => {
  it("always allows", async () => {
    expect((await new AllowGate().check("0xabc")).ok).toBe(true);
  });
});

describe("PassportGate", () => {
  const ADDR = "0xAbC0000000000000000000000000000000000001"; // well-formed 40-hex EVM address
  type Fetcher = ConstructorParameters<typeof PassportGate>[0]["fetcher"];
  const gate = (fetcher: ReturnType<typeof vi.fn>) =>
    new PassportGate({ apiKey: "k", scorerId: "1", minScore: 15, fetcher: fetcher as unknown as Fetcher });

  it("allows when score >= threshold", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ score: "20.5" }) });
    const r = await gate(fetcher).check(ADDR);
    expect(r.ok).toBe(true);
    expect(r.score).toBeCloseTo(20.5);
  });
  it("denies when score < threshold", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ score: "3" }) });
    expect((await gate(fetcher).check(ADDR)).ok).toBe(false);
  });
  it("fails closed (denies) on a fetch error", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network"));
    expect((await gate(fetcher).check(ADDR)).ok).toBe(false);
  });
  it("fails closed on a non-ok response (passport unavailable)", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    expect((await gate(fetcher).check(ADDR)).ok).toBe(false);
  });
  it("fails closed when score is missing, null, empty, or non-numeric", async () => {
    for (const score of [undefined, null, "", "abc"]) {
      const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ score }) });
      expect((await gate(fetcher).check(ADDR)).ok).toBe(false);
    }
  });
  it("fails closed on a malformed address before any network call", async () => {
    const fetcher = vi.fn();
    expect((await gate(fetcher).check("0x123")).ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("getGate", () => {
  it("returns AllowGate when SYBIL_GATE=allow", () => {
    expect(getGate({ SYBIL_GATE: "allow" }) instanceof AllowGate).toBe(true);
  });
});
