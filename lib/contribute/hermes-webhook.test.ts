import { describe, it, expect, vi, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { dispatchHermesEvent } from "./hermes-webhook";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; delete process.env.HERMES_WEBHOOK_URL; delete process.env.HERMES_WEBHOOK_SECRET; vi.restoreAllMocks(); });

describe("dispatchHermesEvent", () => {
  it("is a no-op when HERMES_WEBHOOK_URL is unset", async () => {
    const f = vi.fn();
    globalThis.fetch = f as unknown as typeof fetch;
    await dispatchHermesEvent({ type: "contribution.new", contributionId: "a" });
    expect(f).not.toHaveBeenCalled();
  });
  it("POSTs a signed event when configured", async () => {
    process.env.HERMES_WEBHOOK_URL = "http://hermes.test/hook";
    process.env.HERMES_WEBHOOK_SECRET = "shh";
    const f = vi.fn(async () => ({ ok: true, status: 200 }));
    globalThis.fetch = f as unknown as typeof fetch;
    await dispatchHermesEvent({ type: "contribution.flagged", contributionId: "c1" });
    expect(f).toHaveBeenCalledTimes(1);
    const call = f.mock.calls[0] as unknown as [string, { method: string; headers: Record<string, string>; body: string }];
    const [url, init] = call;
    expect(url).toBe("http://hermes.test/hook");
    expect(init.method).toBe("POST");
    const payload = JSON.parse(init.body) as { type: string; contributionId: string; ts: number; deliveryId: string };
    expect(payload.type).toBe("contribution.flagged");
    expect(payload.contributionId).toBe("c1");
    expect(typeof payload.ts).toBe("number");
    expect(typeof payload.deliveryId).toBe("string");
    const expected = "sha256=" + createHmac("sha256", "shh").update(init.body).digest("hex");
    expect(init.headers["x-pa-signature"]).toBe(expected);
    expect(init.headers["x-pa-timestamp"]).toBe(String(payload.ts));
    expect(init.headers["x-pa-delivery"]).toBe(payload.deliveryId);
  });
  it("swallows a fetch failure (fire-and-forget)", async () => {
    process.env.HERMES_WEBHOOK_URL = "http://hermes.test/hook";
    process.env.HERMES_WEBHOOK_SECRET = "shh";
    globalThis.fetch = (vi.fn(async () => { throw new Error("down"); }) as unknown) as typeof fetch;
    await expect(dispatchHermesEvent({ type: "contribution.new", contributionId: "a" })).resolves.toBeUndefined();
  });
  it("is a no-op when the secret is unset even if the URL is set", async () => {
    process.env.HERMES_WEBHOOK_URL = "http://hermes.test/hook";
    delete process.env.HERMES_WEBHOOK_SECRET;
    const f = vi.fn();
    globalThis.fetch = f as unknown as typeof fetch;
    await dispatchHermesEvent({ type: "contribution.new", contributionId: "a" });
    expect(f).not.toHaveBeenCalled();
  });
});
