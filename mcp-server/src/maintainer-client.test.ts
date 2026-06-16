import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callMaintainer, maintainerGate } from "./maintainer-client.js";

const realFetch = globalThis.fetch;
beforeEach(() => { process.env.PA_BASE_URL = "http://pa.test"; process.env.MAINTAINER_API_KEY = "k3y"; });
afterEach(() => { globalThis.fetch = realFetch; vi.restoreAllMocks(); });

describe("callMaintainer", () => {
  it("calls the maintainer REST path with the bearer key + JSON body", async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
    globalThis.fetch = f as unknown as typeof fetch;
    const r = await callMaintainer("verdict", { method: "POST", body: { contributionId: "a", verdict: "verify" } });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("http://pa.test/api/maintainer/verdict");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer k3y");
    expect(JSON.parse(init.body)).toEqual({ contributionId: "a", verdict: "verify" });
    expect(r).toEqual({ ok: true, status: 200, data: { ok: true } });
  });
  it("GET sends no body", async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) }));
    globalThis.fetch = f as unknown as typeof fetch;
    await callMaintainer("queue", { method: "GET" });
    expect(f.mock.calls[0]![1].body).toBeUndefined();
  });
  it("surfaces a non-ok status", async () => {
    globalThis.fetch = (vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: "unauthorized" }) })) as unknown) as typeof fetch;
    const r = await callMaintainer("queue", { method: "GET" });
    expect(r.ok).toBe(false); expect(r.status).toBe(401);
  });
});

describe("maintainerGate", () => {
  it("accepts the exact bearer key", () => { expect(maintainerGate("Bearer k3y")).toBe(true); });
  it("rejects a wrong key", () => { expect(maintainerGate("Bearer nope")).toBe(false); });
  it("rejects a missing/non-bearer header", () => { expect(maintainerGate(undefined)).toBe(false); expect(maintainerGate("Basic k3y")).toBe(false); });
  it("fails closed when the key is unset", () => { delete process.env.MAINTAINER_API_KEY; expect(maintainerGate("Bearer k3y")).toBe(false); });
});
