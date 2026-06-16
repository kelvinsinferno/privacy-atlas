import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/contribute/auth", () => ({ gatedAddress: vi.fn() }));
vi.mock("@/lib/db/queries", () => ({ insertContribution: vi.fn() }));
vi.mock("@/lib/contribute/validate", () => ({ validatePayload: vi.fn() }));
vi.mock("@/lib/community", () => ({ newEntryId: vi.fn(() => "new-id") }));
vi.mock("@/lib/contribute/hermes-webhook", () => ({ dispatchHermesEvent: vi.fn() }));
vi.mock("next/server", async (orig) => ({ ...(await orig() as object), after: (fn: () => unknown) => fn() }));

import { gatedAddress } from "@/lib/contribute/auth";
import { insertContribution } from "@/lib/db/queries";
import { validatePayload } from "@/lib/contribute/validate";
import { dispatchHermesEvent } from "@/lib/contribute/hermes-webhook";
import { POST } from "./route";

beforeEach(() => vi.clearAllMocks());
const req = (b: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(b) });

let realValidatePayload: typeof validatePayload;
beforeEach(async () => {
  if (!realValidatePayload) {
    const real = await vi.importActual<typeof import("@/lib/contribute/validate")>("@/lib/contribute/validate");
    realValidatePayload = real.validatePayload;
  }
});

describe("POST /submit", () => {
  beforeEach(() => {
    // Use the real validatePayload for the existing integration-style tests.
    (validatePayload as ReturnType<typeof vi.fn>).mockImplementation(realValidatePayload);
  });

  it("returns the gate's error response when not eligible", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Response("no", { status: 403 }) });
    expect((await POST(req({ nodeKind: "move", label: "x" }))).status).toBe(403);
  });
  it("400 on invalid payload", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    expect((await POST(req({ nodeKind: "bad" }))).status).toBe(400);
    expect(insertContribution).not.toHaveBeenCalled();
  });
  it("400 on a malformed (non-JSON) body, without inserting", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    const res = await POST(new Request("http://x", { method: "POST", body: "{not json" }));
    expect(res.status).toBe(400);
    expect(insertContribution).not.toHaveBeenCalled();
  });
  it("inserts with the authenticated address as submitter (not the body) + returns an id", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    // a body that tries to spoof the submitter must be ignored
    const res = await POST(req({ nodeKind: "move", label: "Use a faraday bag", submitter: "0xEVIL" }));
    expect(res.status).toBe(200);
    expect(insertContribution).toHaveBeenCalledOnce();
    expect(insertContribution).toHaveBeenCalledWith(expect.objectContaining({ submitter: "0xabc", removed: false }));
  });
  it("accepts a how-to submission and inserts it with kind 'howto'", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    const res = await POST(req({ kind: "howto", targetId: "password-manager", platform: "iOS", steps: ["open settings", "enable it"] }));
    expect(res.status).toBe(200);
    expect(insertContribution).toHaveBeenCalledWith(expect.objectContaining({ kind: "howto", submitter: "0xabc" }));
  });
  it("400 on an invalid how-to (no steps), without inserting", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    const res = await POST(req({ kind: "howto", targetId: "x", platform: "iOS", steps: [] }));
    expect(res.status).toBe(400);
    expect(insertContribution).not.toHaveBeenCalled();
  });
  it("accepts a resource and inserts it with kind 'resource'", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    const res = await POST(req({ kind: "resource", targetId: "device-disposal", name: "ShredOS", url: "https://x.org/s", resourceType: "link" }));
    expect(res.status).toBe(200);
    expect(insertContribution).toHaveBeenCalledWith(expect.objectContaining({ kind: "resource", submitter: "0xabc" }));
  });
  it("accepts a source and inserts it with kind 'source'", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    const res = await POST(req({ kind: "source", targetId: "T-BROKER", title: "EFF", url: "https://eff.org/x", sourceKind: "org" }));
    expect(res.status).toBe(200);
    expect(insertContribution).toHaveBeenCalledWith(expect.objectContaining({ kind: "source", submitter: "0xabc" }));
  });
  it("STRIPS a client-supplied affiliate/commercial block from a resource (never stored)", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    await POST(req({ kind: "resource", targetId: "x", name: "Sneaky", url: "https://s.com", resourceType: "link", affiliate: { hasProgram: true }, commercial: true, reviewMeta: { commercial: true } }));
    const arg = (insertContribution as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0];
    expect(arg.payload).not.toHaveProperty("affiliate");
    expect(arg.payload).not.toHaveProperty("commercial");
    expect(arg.payload).not.toHaveProperty("reviewMeta");
  });
  it("400 on an invalid resource (non-https url), without inserting", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    const res = await POST(req({ kind: "resource", targetId: "x", name: "N", url: "http://x.org", resourceType: "link" }));
    expect(res.status).toBe(400);
    expect(insertContribution).not.toHaveBeenCalled();
  });
});

describe("POST /submit — Hermes trigger", () => {
  beforeEach(() => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    (validatePayload as ReturnType<typeof vi.fn>).mockReturnValue({ ok: true, kind: "howto", value: { kind: "howto", targetId: "n", platform: "p", steps: ["s"] } });
  });

  it("fires a contribution.new event after a successful submit", async () => {
    const res = await POST(req({ kind: "howto", targetId: "n", platform: "p", steps: ["s"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "new-id" });
    expect(dispatchHermesEvent).toHaveBeenCalledWith({ type: "contribution.new", contributionId: "new-id" });
  });
  it("does NOT fire when validation fails (400)", async () => {
    (validatePayload as ReturnType<typeof vi.fn>).mockReturnValue({ ok: false, error: "bad" });
    const res = await POST(req({ bad: true }));
    expect(res.status).toBe(400);
    expect(dispatchHermesEvent).not.toHaveBeenCalled();
  });
});
