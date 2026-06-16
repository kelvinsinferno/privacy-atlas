/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import HowTo from "./HowTo";
import { fetchHowtos, fetchResources, fetchNodeVoteState, castNodeVote } from "@/lib/contribute/vote-state";
import { buildModel } from "@/lib/model";
import { HOWTOS } from "@/data/howtos";
import type { ModelNode } from "@/lib/types";

// HowTo loads live community how-tos via fetchHowtos, and the VoteControl it
// renders per how-to reads fetchNodeVoteState / casts via castNodeVote. Mock all
// three so nothing hits the network.
vi.mock("@/lib/contribute/vote-state", () => ({
  fetchHowtos: vi.fn(),
  fetchResources: vi.fn(),
  fetchNodeVoteState: vi.fn(),
  castNodeVote: vi.fn(),
}));

// connectAndSignIn is called on a 401 submit; never needed for happy paths.
vi.mock("@/lib/wallet", () => ({
  connectAndSignIn: vi.fn().mockResolvedValue("0xabc"),
  shortAddress: (a: string) => a,
}));

// Each how-to card now renders <StepHelp>, which lazily pulls in EmbeddedAIChat
// (AI/network). Stub it to a marker div so the suite stays hermetic — we only
// assert it's present per card, not its internals.
vi.mock("@/components/detail/StepHelp", () => ({ default: () => <div data-testid="step-help" /> }));

// The community-static (tier-2) layer is baked JSON. Default to EMPTY maps so the
// existing seed/live/phishing tests are unaffected; tier-2 tests override the
// COMMUNITY_HOWTOS entry for SEED_ID below.
const BAKED_HOWTOS: Record<string, any[]> = {};
vi.mock("@/data/community-content", () => ({
  COMMUNITY_HOWTOS: new Proxy({}, { get: (_t, k: string) => BAKED_HOWTOS[k] }),
  COMMUNITY_RESOURCES: {},
  COMMUNITY_SOURCES: {},
}));

// Use a real node that has a HOWTOS seed entry so the seed path renders.
const model = buildModel({});
const SEED_ID = "password-manager";
const node = (id: string): ModelNode => {
  const n = model.byId.get(id);
  if (!n) throw new Error("test fixture missing node: " + id);
  return n;
};

const VIEW = (over: any = {}): any => ({
  id: "howto-1",
  payload: { kind: "howto", targetId: SEED_ID, platform: "iOS 26.4", steps: ["Open Settings", "Tap Privacy"] },
  score: 0,
  badge: "none",
  status: "pending",
  stale: false,
  ...over,
});

const STATE = (over: any = {}): any => ({ confirms: 0, flags: 0, score: 0, badge: "none", status: "pending", stale: false, ...over });

beforeEach(() => {
  for (const k of Object.keys(BAKED_HOWTOS)) delete BAKED_HOWTOS[k];
  (fetchHowtos as any).mockReset().mockResolvedValue([]);
  (fetchResources as any).mockReset().mockResolvedValue([]);
  // VoteControl resolves a (zero) state so its thumbs render fully.
  (fetchNodeVoteState as any).mockReset().mockResolvedValue(STATE());
  (castNodeVote as any).mockReset().mockResolvedValue({ ok: true });
  (globalThis as any).fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as any);
});
afterEach(() => vi.restoreAllMocks());

describe("HowTo — community how-tos from the backend", () => {
  test("renders a community how-to's platform + steps + a VoteControl", async () => {
    (fetchHowtos as any).mockResolvedValue([VIEW()]);

    render(<HowTo node={node(SEED_ID)} contributions={{}} setContributions={vi.fn()} />);

    expect(await screen.findByText("iOS 26.4")).toBeInTheDocument();
    expect(screen.getByText("Open Settings")).toBeInTheDocument();
    expect(screen.getByText("Tap Privacy")).toBeInTheDocument();
    // VoteControl thumbs render once its state resolves. The seed how-to also
    // carries a VoteControl, so there are ≥2 thumbs-up/down once both resolve.
    await waitFor(() => expect(screen.getAllByRole("button", { name: /thumbs up/i }).length).toBeGreaterThanOrEqual(2));
    expect(screen.getAllByRole("button", { name: /thumbs down/i }).length).toBeGreaterThanOrEqual(2);
    // each how-to card now carries a StepHelp (mocked to a marker div)
    expect(screen.getAllByTestId("step-help").length).toBeGreaterThanOrEqual(1);
  });
});

describe("HowTo — no duplicate of the seed how-to", () => {
  test("a fetchHowtos item carrying the seed id (howto:<nodeId>) is NOT rendered again as a community card", async () => {
    // The seed how-to is also a DB row (id "howto:<nodeId>"); it must render only
    // once (from the static HOWTOS), never a second time from the live list.
    (fetchHowtos as any).mockResolvedValue([
      VIEW({ id: "howto:" + SEED_ID, payload: { kind: "howto", targetId: SEED_ID, platform: "SEED-DUPLICATE-SHOULD-BE-FILTERED", steps: ["x"] } }),
      VIEW({ id: "community-real", payload: { kind: "howto", targetId: SEED_ID, platform: "A real community howto", steps: ["y"] } }),
    ]);

    render(<HowTo node={node(SEED_ID)} contributions={{}} setContributions={vi.fn()} />);

    expect(await screen.findByText("A real community howto")).toBeInTheDocument();
    expect(screen.queryByText("SEED-DUPLICATE-SHOULD-BE-FILTERED")).not.toBeInTheDocument();
  });
});

describe("HowTo — community-static (tier 2) baked how-tos", () => {
  test("a baked how-to renders as a verified card with a clickable source link + a VoteControl", async () => {
    BAKED_HOWTOS[SEED_ID] = [
      { id: "baked-howto-1", platform: "BAKED Pixel 9", steps: ["Baked step one"], src: { url: "https://baked.example.org/guide" } },
    ];
    (fetchHowtos as any).mockResolvedValue([]);

    const { container } = render(<HowTo node={node(SEED_ID)} contributions={{}} setContributions={vi.fn()} />);

    expect(await screen.findByText("BAKED Pixel 9")).toBeInTheDocument();
    expect(screen.getByText("Baked step one")).toBeInTheDocument();
    // baked items are verified → clickable <a href>
    await waitFor(() => expect(container.querySelectorAll('a[href="https://baked.example.org/guide"]').length).toBeGreaterThan(0));
    // baked card carries a VoteControl (plus the seed's), so ≥2 thumbs once resolved
    await waitFor(() => expect(screen.getAllByRole("button", { name: /thumbs up/i }).length).toBeGreaterThanOrEqual(2));
  });

  test("a LIVE how-to whose id equals a baked id does NOT double-render (dedup)", async () => {
    BAKED_HOWTOS[SEED_ID] = [
      { id: "dup-id", platform: "BAKED-WINS", steps: ["baked step"] },
    ];
    // fetchHowtos returns a live item with the SAME id — it must be filtered out.
    (fetchHowtos as any).mockResolvedValue([
      VIEW({ id: "dup-id", payload: { kind: "howto", targetId: SEED_ID, platform: "LIVE-DUPLICATE-SHOULD-BE-FILTERED", steps: ["live step"] } }),
    ]);

    render(<HowTo node={node(SEED_ID)} contributions={{}} setContributions={vi.fn()} />);

    // baked card renders once…
    expect(await screen.findByText("BAKED-WINS")).toBeInTheDocument();
    // …and the live duplicate (same id) never renders.
    expect(screen.queryByText("LIVE-DUPLICATE-SHOULD-BE-FILTERED")).not.toBeInTheDocument();
  });
});

describe("HowTo — device-variant branch is votable", () => {
  test("the device-exact (variant) how-to also shows a VoteControl", async () => {
    (fetchHowtos as any).mockResolvedValue([]);
    // ad-id-reset has device variants (axis "phone"); selecting a device routes to
    // the variant branch, which must still carry a vote control.
    render(<HowTo node={node("ad-id-reset")} contributions={{}} setContributions={vi.fn()} myDevices={{ phone: "ios" } as any} />);
    expect(await screen.findByText(/exact steps/i)).toBeInTheDocument();
    // the variant how-to carries a VoteControl; ResourceList (seed resources) may add more
    expect((await screen.findAllByRole("button", { name: /thumbs up/i })).length).toBeGreaterThanOrEqual(1);
  });
});

describe("HowTo — PHISHING GUARD (community source URL)", () => {
  test("badge 'none' + a src.url renders the URL as PLAIN TEXT (no <a href>)", async () => {
    const phishingUrl = "https://attacker.example.org/fake";
    (fetchHowtos as any).mockResolvedValue([VIEW({ badge: "none", payload: { kind: "howto", targetId: SEED_ID, platform: "Android", steps: ["step one"], src: { url: phishingUrl } } })]);

    const { container } = render(<HowTo node={node(SEED_ID)} contributions={{}} setContributions={vi.fn()} />);

    expect(await screen.findByText(phishingUrl)).toBeInTheDocument();
    expect(container.querySelectorAll(`a[href="${phishingUrl}"]`)).toHaveLength(0);
    expect(screen.getByText(/claimed source \(verify\)/i)).toBeInTheDocument();
  });

  test("badge 'verified' + a src.url renders a clickable <a>", async () => {
    const goodUrl = "https://trustworthy.example.org/real";
    (fetchHowtos as any).mockResolvedValue([VIEW({ badge: "verified", status: "verified", payload: { kind: "howto", targetId: SEED_ID, platform: "Android", steps: ["step one"], src: { url: goodUrl } } })]);

    const { container } = render(<HowTo node={node(SEED_ID)} contributions={{}} setContributions={vi.fn()} />);

    await screen.findByText("Android");
    await waitFor(() => expect(container.querySelectorAll(`a[href="${goodUrl}"]`).length).toBeGreaterThan(0));
  });
});

describe("HowTo — submit posts a how-to and clears the form", () => {
  test("posts {kind:'howto', targetId, platform, steps} to /api/contribute/submit and clears", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    (fetchHowtos as any).mockResolvedValue([]);
    render(<HowTo node={node(SEED_ID)} contributions={{}} setContributions={vi.fn()} />);

    // open the form
    await user.click(screen.getByText(/add \/ improve a how-to/i));

    const platformInput = screen.getByPlaceholderText(/device \+ version/i) as HTMLInputElement;
    const stepsInput = screen.getByPlaceholderText(/one step per line/i) as HTMLTextAreaElement;
    await user.type(platformInput, "iOS 26.4");
    await user.type(stepsInput, "First step\nSecond step");

    await user.click(screen.getByRole("button", { name: /submit how-to/i }));

    await waitFor(() => {
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "/api/contribute/submit",
        expect.objectContaining({ method: "POST" }),
      );
    });

    // assert the POST body shape
    const call = ((globalThis as any).fetch as any).mock.calls.find((c: any[]) => c[0] === "/api/contribute/submit");
    const body = JSON.parse(call[1].body);
    expect(body).toMatchObject({ kind: "howto", targetId: SEED_ID, platform: "iOS 26.4", steps: ["First step", "Second step"] });

    // form clears after a successful submit
    await waitFor(() => expect(platformInput.value).toBe(""));
    expect(stepsInput.value).toBe("");
  });
});

describe("HowTo — graceful degradation", () => {
  test("when fetchHowtos returns [] (backend down) the seed how-to still renders", async () => {
    (fetchHowtos as any).mockResolvedValue([]);
    render(<HowTo node={node(SEED_ID)} contributions={{}} setContributions={vi.fn()} />);

    expect(screen.getByText("HOW TO DO THIS")).toBeInTheDocument();
    // first step of the password-manager starter seed (from HOWTOS)
    expect(HOWTOS[SEED_ID]).toBeTruthy();
    expect(screen.getByText(/Pick a reputable manager/)).toBeInTheDocument();
    // the seed how-to carries a VoteControl too (once its state resolves);
    // ResourceList's seed resources add more, so assert ≥1
    expect((await screen.findAllByRole("button", { name: /thumbs up/i })).length).toBeGreaterThanOrEqual(1);
  });
});
