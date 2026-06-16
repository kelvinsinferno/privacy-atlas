import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/contribute/auth", () => ({ gatedAddress: vi.fn() }));
vi.mock("@/lib/db/queries", () => ({ castVote: vi.fn(), countFlags: vi.fn() }));
vi.mock("@/lib/contribute/hermes-webhook", () => ({ dispatchHermesEvent: vi.fn() }));
vi.mock("next/server", async (orig) => ({ ...(await orig() as object), after: (fn: () => unknown) => fn() }));

import { gatedAddress } from "@/lib/contribute/auth";
import { castVote, countFlags } from "@/lib/db/queries";
import { dispatchHermesEvent } from "@/lib/contribute/hermes-webhook";
import { POST } from "./route";
beforeEach(() => vi.clearAllMocks());
const req = (b: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(b) });

describe("POST /vote", () => {
  it("401/403 path: returns the gate error", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Response("no", { status: 401 }) });
    expect((await POST(req({ contributionId: "a", vote: "confirm" }))).status).toBe(401);
  });
  it("400 on bad vote kind", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    expect((await POST(req({ contributionId: "a", vote: "love" }))).status).toBe(400);
  });
  it("records a vote (counted=true) on success", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    (castVote as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (countFlags as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    const res = await POST(req({ contributionId: "a", vote: "confirm" }));
    expect((await res.json()).counted).toBe(true);
  });
  it("counted=false when the wallet already voted", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    (castVote as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    expect((await (await POST(req({ contributionId: "a", vote: "flag" }))).json()).counted).toBe(false);
  });
  it("400 on a malformed JSON body", async () => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    const res = await POST(new Request("http://x", { method: "POST", body: "{bad" }));
    expect(res.status).toBe(400);
    expect(castVote).not.toHaveBeenCalled();
  });
});

describe("POST /vote — Hermes flag trigger", () => {
  beforeEach(() => {
    (gatedAddress as ReturnType<typeof vi.fn>).mockResolvedValue({ address: "0xabc" });
    (castVote as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it("fires contribution.flagged when a NEW flag reaches the threshold (3)", async () => {
    (countFlags as ReturnType<typeof vi.fn>).mockResolvedValue(3);
    const res = await POST(req({ contributionId: "c1", vote: "flag" }));
    expect(res.status).toBe(200);
    expect(dispatchHermesEvent).toHaveBeenCalledWith({ type: "contribution.flagged", contributionId: "c1" });
  });
  it("does NOT fire below the threshold", async () => {
    (countFlags as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    await POST(req({ contributionId: "c1", vote: "flag" }));
    expect(dispatchHermesEvent).not.toHaveBeenCalled();
  });
  it("does NOT fire above the threshold (fires once, at the crossing)", async () => {
    (countFlags as ReturnType<typeof vi.fn>).mockResolvedValue(4);
    await POST(req({ contributionId: "c1", vote: "flag" }));
    expect(dispatchHermesEvent).not.toHaveBeenCalled();
  });
  it("does NOT fire on a confirm vote", async () => {
    await POST(req({ contributionId: "c1", vote: "confirm" }));
    expect(countFlags).not.toHaveBeenCalled();
    expect(dispatchHermesEvent).not.toHaveBeenCalled();
  });
  it("does NOT fire when the flag was already cast (counted=false)", async () => {
    (castVote as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    await POST(req({ contributionId: "c1", vote: "flag" }));
    expect(countFlags).not.toHaveBeenCalled();
    expect(dispatchHermesEvent).not.toHaveBeenCalled();
  });
});
