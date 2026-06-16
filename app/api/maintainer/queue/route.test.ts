import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/db/queries", () => ({ listPendingForReview: vi.fn() }));
import { listPendingForReview } from "@/lib/db/queries";
import { GET } from "./route";

const req = (auth?: string) => new Request("http://x/api/maintainer/queue", auth ? { headers: { authorization: auth } } : {});

beforeEach(() => { vi.clearAllMocks(); process.env.MAINTAINER_API_KEY = "k"; });

describe("GET /api/maintainer/queue", () => {
  it("401 without the bearer key", async () => {
    expect((await GET(req())).status).toBe(401);
    expect(listPendingForReview).not.toHaveBeenCalled();
  });
  it("returns the queue for an authed maintainer", async () => {
    (listPendingForReview as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "a" }]);
    const res = await GET(req("Bearer k"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ id: "a" }] });
  });
});
