import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRegions } from "./vote-state";

afterEach(() => vi.restoreAllMocks());

function mockList(items: unknown[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = vi.fn(async () => ({ ok: true, json: async () => ({ items }) }));
}

describe("fetchRegions", () => {
  it("returns region contributions for the node, mapping score/badge/status", async () => {
    mockList([
      { id: "r1", kind: "region", payload: { kind: "region", targetId: "credit-freeze-big3", country: "DE", status: "different" }, confirms: 3, flags: 1, badge: "verified", status: "verified" },
      { id: "h1", kind: "howto", payload: { kind: "howto", targetId: "credit-freeze-big3", platform: "x", steps: ["a"] }, status: "pending" },
      { id: "r2", kind: "region", payload: { kind: "region", targetId: "other-node", country: "GB", status: "applies" }, status: "pending" },
    ]);
    const out = await fetchRegions("credit-freeze-big3");
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("r1");
    expect(out[0]!.payload.country).toBe("DE");
    expect(out[0]!.score).toBe(2);
    expect(out[0]!.badge).toBe("verified");
  });
  it("returns [] when the backend fails", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn(async () => ({ ok: false }));
    expect(await fetchRegions("x")).toEqual([]);
  });
});
