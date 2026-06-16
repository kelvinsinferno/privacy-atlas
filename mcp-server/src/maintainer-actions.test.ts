import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("./maintainer-client.js", () => ({ callMaintainer: vi.fn(async () => ({ ok: true, status: 200, data: { ok: true } })) }));
import { callMaintainer } from "./maintainer-client.js";
import { actions } from "./maintainer-actions.js";

const mock = callMaintainer as unknown as ReturnType<typeof vi.fn>;
beforeEach(() => { mock.mockClear(); });

describe("maintainer actions", () => {
  it("list_pending → GET queue", async () => {
    await actions.list_pending();
    expect(mock).toHaveBeenCalledWith("queue", { method: "GET" });
  });
  it("grant_badge → verdict verify", async () => {
    await actions.grant_badge({ contributionId: "a", reason: "good" });
    expect(mock).toHaveBeenCalledWith("verdict", { method: "POST", body: { contributionId: "a", verdict: "verify", reason: "good" } });
  });
  it("revoke_badge → verdict unverify", async () => {
    await actions.revoke_badge({ contributionId: "a" });
    expect(mock).toHaveBeenCalledWith("verdict", { method: "POST", body: { contributionId: "a", verdict: "unverify", reason: undefined } });
  });
  it("reject → verdict reject", async () => {
    await actions.reject({ contributionId: "a", reason: "broken" });
    expect(mock).toHaveBeenCalledWith("verdict", { method: "POST", body: { contributionId: "a", verdict: "reject", reason: "broken" } });
  });
  it("set_review_meta → review-meta with the passed fields", async () => {
    await actions.set_review_meta({ contributionId: "a", commercial: true, affiliate: { url: "https://x/?ref=pa" } });
    expect(mock).toHaveBeenCalledWith("review-meta", { method: "POST", body: { contributionId: "a", commercial: true, affiliate: { url: "https://x/?ref=pa" } } });
  });
});
