import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/db/queries", () => ({ listContributions: vi.fn() }));
import { listContributions } from "@/lib/db/queries";
import { GET } from "./route";
beforeEach(() => vi.clearAllMocks());

describe("GET /list", () => {
  it("returns pending + verified, drops rejected", async () => {
    (listContributions as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "a", status: "pending", payload: {}, ts: 1, confirms: 0, flags: 0 },
      { id: "b", status: "verified", payload: {}, ts: 1, confirms: 20, flags: 0 },
      { id: "c", status: "rejected", payload: {}, ts: 1, confirms: 0, flags: 20 },
    ]);
    const items = (await (await GET()).json()).items as { id: string }[];
    expect(items.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });
});
