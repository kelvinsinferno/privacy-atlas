import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => ({ value: "tok" }) })) }));
vi.mock("@/lib/contribute/session", () => ({ readSession: vi.fn() }));
vi.mock("@/lib/db/queries", () => ({ removeContribution: vi.fn() }));
import { readSession } from "@/lib/contribute/session";
import { removeContribution } from "@/lib/db/queries";
import { POST } from "./route";
beforeEach(() => { vi.clearAllMocks(); process.env.ADMIN_ADDRESSES = "0xadmin"; });
const req = (b: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(b) });

describe("POST /moderate", () => {
  it("403 for a non-admin address", async () => {
    (readSession as ReturnType<typeof vi.fn>).mockResolvedValue("0xnotadmin");
    expect((await POST(req({ contributionId: "a", action: "remove" }))).status).toBe(403);
    expect(removeContribution).not.toHaveBeenCalled();
  });
  it("removes for an admin", async () => {
    (readSession as ReturnType<typeof vi.fn>).mockResolvedValue("0xADMIN");
    const res = await POST(req({ contributionId: "a", action: "remove" }));
    expect(res.status).toBe(200);
    expect(removeContribution).toHaveBeenCalledWith("a");
  });
  it("403 when there is no session", async () => {
    (readSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect((await POST(req({ contributionId: "a", action: "remove" }))).status).toBe(403);
    expect(removeContribution).not.toHaveBeenCalled();
  });
  it("403 for everyone when ADMIN_ADDRESSES is empty (no accidental open admin)", async () => {
    process.env.ADMIN_ADDRESSES = "";
    (readSession as ReturnType<typeof vi.fn>).mockResolvedValue("0xadmin");
    expect((await POST(req({ contributionId: "a", action: "remove" }))).status).toBe(403);
    expect(removeContribution).not.toHaveBeenCalled();
  });
  it("400 for an admin on an unknown action (no removal)", async () => {
    (readSession as ReturnType<typeof vi.fn>).mockResolvedValue("0xadmin");
    expect((await POST(req({ contributionId: "a", action: "nuke" }))).status).toBe(400);
    expect(removeContribution).not.toHaveBeenCalled();
  });
});
