import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/db/queries", () => ({ setVerdict: vi.fn(), appendAudit: vi.fn() }));
import { setVerdict, appendAudit } from "@/lib/db/queries";
import { POST } from "./route";

const req = (body: unknown, auth = "Bearer k") =>
  new Request("http://x/api/maintainer/verdict", { method: "POST", headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => { vi.clearAllMocks(); process.env.MAINTAINER_API_KEY = "k"; });

describe("POST /api/maintainer/verdict", () => {
  it("401 without the key", async () => {
    expect((await POST(req({ contributionId: "a", verdict: "verify" }, "Bearer x"))).status).toBe(401);
    expect(setVerdict).not.toHaveBeenCalled();
  });
  it("400 on an invalid verdict", async () => {
    expect((await POST(req({ contributionId: "a", verdict: "maybe" }))).status).toBe(400);
  });
  it("applies a verify verdict as hermes + audits it", async () => {
    const res = await POST(req({ contributionId: "a", verdict: "verify", reason: "looks good" }));
    expect(res.status).toBe(200);
    expect(setVerdict).toHaveBeenCalledWith("a", { verdict: "verify", reviewer: "hermes", reason: "looks good" });
    expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({ actor: "hermes", action: "verify", contributionId: "a", reason: "looks good" }));
  });
});
