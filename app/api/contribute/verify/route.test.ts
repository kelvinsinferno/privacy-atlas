// @vitest-environment node
// issueSession signs a JWT via jose, whose `instanceof Uint8Array` key check
// fails under the global jsdom environment (jsdom typed arrays live in a
// different realm); run this route's tests in node. Mirrors session.test.ts.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/queries", () => ({ consumeNonce: vi.fn() }));
vi.mock("@/lib/contribute/siwe", () => ({ verifySiwe: vi.fn() }));
import { consumeNonce } from "@/lib/db/queries";
import { verifySiwe } from "@/lib/contribute/siwe";
import { POST } from "./route";

beforeEach(() => { vi.clearAllMocks(); process.env.SESSION_SECRET = "test-secret-test-secret-test-secret"; });
const req = (body: unknown) => new Request("http://x/api/contribute/verify", { method: "POST", body: JSON.stringify(body) });

describe("POST /verify", () => {
  it("400 on missing fields", async () => {
    expect((await POST(req({}))).status).toBe(400);
  });
  it("401 on bad nonce", async () => {
    (consumeNonce as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    expect((await POST(req({ message: "m", signature: "s", nonce: "n" }))).status).toBe(401);
  });
  it("401 on bad signature", async () => {
    (consumeNonce as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (verifySiwe as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect((await POST(req({ message: "m", signature: "s", nonce: "n" }))).status).toBe(401);
  });
  it("sets a session cookie on success", async () => {
    (consumeNonce as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (verifySiwe as ReturnType<typeof vi.fn>).mockResolvedValue("0xabc");
    const res = await POST(req({ message: "m", signature: "s", nonce: "n" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("pa_session=");
  });
});
