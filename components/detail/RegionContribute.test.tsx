import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegionContribute from "./RegionContribute";

vi.mock("@/lib/wallet", () => ({ connectAndSignIn: vi.fn().mockResolvedValue("0xabc") }));

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: "new" }) }));
});
afterEach(() => vi.restoreAllMocks());

describe("RegionContribute", () => {
  it("posts a region contribution with the target, country, status, note + steps", async () => {
    const user = userEvent.setup();
    render(<RegionContribute nodeId="credit-freeze-big3" country="DE" onSubmitted={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/how this move works/i), "Use SCHUFA in Germany.");
    await user.type(screen.getByPlaceholderText(/one step per line/i), "Contact SCHUFA\nRequest a freeze");
    await user.click(screen.getByRole("button", { name: /^submit$/i }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await waitFor(() => expect((globalThis as any).fetch).toHaveBeenCalledWith("/api/contribute/submit", expect.objectContaining({ method: "POST" })));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = JSON.parse(((globalThis as any).fetch as any).mock.calls.find((c: any[]) => c[0] === "/api/contribute/submit")[1].body);
    expect(body).toMatchObject({ kind: "region", targetId: "credit-freeze-big3", country: "DE", note: "Use SCHUFA in Germany.", steps: ["Contact SCHUFA", "Request a freeze"] });
    expect(["applies", "different", "not-applicable"]).toContain(body.status);
  });
});
