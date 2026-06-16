import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/db/queries", () => ({ setReviewMeta: vi.fn(), appendAudit: vi.fn() }));
import { setReviewMeta, appendAudit } from "@/lib/db/queries";
import { POST } from "./route";

const req = (body: unknown, auth = "Bearer k") =>
  new Request("http://x/api/maintainer/review-meta", { method: "POST", headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => { vi.clearAllMocks(); process.env.MAINTAINER_API_KEY = "k"; });

describe("POST /api/maintainer/review-meta", () => {
  it("401 without the key", async () => {
    expect((await POST(req({ contributionId: "a", commercial: true }, "Bearer x"))).status).toBe(401);
    expect(setReviewMeta).not.toHaveBeenCalled();
  });
  it("sets commercial + affiliate meta (stamped hermes) + audits", async () => {
    const res = await POST(req({ contributionId: "a", commercial: true, affiliate: { hasProgram: true, url: "https://x/?ref=pa", notes: "20%" } }));
    expect(res.status).toBe(200);
    expect(setReviewMeta).toHaveBeenCalledWith("a", expect.objectContaining({ commercial: true, affiliate: { hasProgram: true, url: "https://x/?ref=pa", notes: "20%" }, reviewedBy: "hermes" }));
    expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({ actor: "hermes", action: "review-meta", contributionId: "a" }));
  });
  it("400 on a non-https affiliate url", async () => {
    expect((await POST(req({ contributionId: "a", affiliate: { url: "http://insecure" } }))).status).toBe(400);
  });
});
