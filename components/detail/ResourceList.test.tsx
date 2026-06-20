/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import ResourceList from "./ResourceList";
import { fetchResources, fetchNodeVoteState, castNodeVote } from "@/lib/contribute/vote-state";
import { RESOURCES } from "@/data/resources";

// ResourceList loads live community resources via fetchResources, and the
// VoteControl it renders per resource reads fetchNodeVoteState / casts via
// castNodeVote. Mock all three so nothing hits the network.
vi.mock("@/lib/contribute/vote-state", () => ({
  fetchResources: vi.fn(),
  fetchNodeVoteState: vi.fn(),
  castNodeVote: vi.fn(),
}));

// connectAndSignIn is called on a 401 submit; never needed for happy paths.
vi.mock("@/lib/wallet", () => ({
  connectAndSignIn: vi.fn().mockResolvedValue("0xabc"),
  shortAddress: (a: string) => a,
}));

// The community-static (tier-2) layer is baked JSON. Default to EMPTY maps so the
// existing seed/live/phishing tests are unaffected; tier-2 tests override the
// COMMUNITY_RESOURCES entry for SEED_ID below.
const BAKED_RESOURCES: Record<string, any[]> = {};
vi.mock("@/data/community-content", () => ({
  COMMUNITY_HOWTOS: {},
  COMMUNITY_RESOURCES: new Proxy({}, { get: (_t, k: string) => BAKED_RESOURCES[k] }),
  COMMUNITY_SOURCES: {},
}));

// Use a real node that has a RESOURCES seed entry so the seed path renders.
const SEED_ID = "network-privacy";

const VIEW = (over: any = {}): any => ({
  id: "res-1",
  payload: { kind: "resource", targetId: SEED_ID, name: "Acme VPN", url: "https://acme.example.org/", resourceType: "link" },
  score: 0,
  badge: "none",
  status: "pending",
  stale: false,
  reviewMeta: null,
  ...over,
});

const STATE = (over: any = {}): any => ({ confirms: 0, flags: 0, score: 0, badge: "none", status: "pending", stale: false, ...over });

beforeEach(() => {
  for (const k of Object.keys(BAKED_RESOURCES)) delete BAKED_RESOURCES[k];
  (fetchResources as any).mockReset().mockResolvedValue([]);
  // VoteControl resolves a (zero) state so its thumbs render fully.
  (fetchNodeVoteState as any).mockReset().mockResolvedValue(STATE());
  (castNodeVote as any).mockReset().mockResolvedValue({ ok: true });
  (globalThis as any).fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as any);
});
afterEach(() => vi.restoreAllMocks());

describe("ResourceList — community resources from the backend", () => {
  test("renders a community resource's name + a VoteControl (thumbs)", async () => {
    (fetchResources as any).mockResolvedValue([VIEW({ payload: { kind: "resource", targetId: SEED_ID, name: "Acme VPN", url: "https://acme.example.org/", resourceType: "link" } })]);

    render(<ResourceList nodeId={SEED_ID} contributions={{}} setContributions={vi.fn()} />);

    expect(await screen.findByText("Acme VPN")).toBeInTheDocument();
    // VoteControl thumbs render once their state resolves. Seed resources also
    // carry VoteControls, so there are ≥1 thumbs-up/down once they resolve.
    await waitFor(() => expect(screen.getAllByRole("button", { name: /thumbs up/i }).length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByRole("button", { name: /thumbs down/i }).length).toBeGreaterThanOrEqual(1);
  });
});

describe("ResourceList — community-static (tier 2) baked resources", () => {
  test("a baked resource renders as a verified card with a clickable <a href> + a VoteControl", async () => {
    BAKED_RESOURCES[SEED_ID] = [
      { id: "baked-res-1", name: "Baked Tool", url: "https://baked.example.org/tool", resourceType: "link", forStep: "for setup" },
    ];
    (fetchResources as any).mockResolvedValue([]);

    const { container } = render(<ResourceList nodeId={SEED_ID} contributions={{}} setContributions={vi.fn()} />);

    expect(await screen.findByText("Baked Tool")).toBeInTheDocument();
    // baked items are verified → clickable <a href>
    await waitFor(() => expect(container.querySelectorAll('a[href="https://baked.example.org/tool"]').length).toBeGreaterThan(0));
    // baked card carries a VoteControl (plus the seed resources'), so ≥1 thumbs once resolved
    await waitFor(() => expect(screen.getAllByRole("button", { name: /thumbs up/i }).length).toBeGreaterThanOrEqual(1));
  });

  test("a LIVE resource whose id equals a baked id does NOT double-render (dedup)", async () => {
    BAKED_RESOURCES[SEED_ID] = [
      { id: "dup-res", name: "BAKED-WINS-RES", url: "https://baked.example.org/x", resourceType: "link" },
    ];
    (fetchResources as any).mockResolvedValue([
      VIEW({ id: "dup-res", payload: { kind: "resource", targetId: SEED_ID, name: "LIVE-DUPLICATE-RES", url: "https://live.example.org/", resourceType: "link" } }),
    ]);

    render(<ResourceList nodeId={SEED_ID} contributions={{}} setContributions={vi.fn()} />);

    expect(await screen.findByText("BAKED-WINS-RES")).toBeInTheDocument();
    expect(screen.queryByText("LIVE-DUPLICATE-RES")).not.toBeInTheDocument();
  });
});

describe("ResourceList — PHISHING GUARD (community resource URL)", () => {
  test("badge 'none' + a url renders PLAIN TEXT (no <a href>)", async () => {
    const phishingUrl = "https://attacker.example.org/fake";
    (fetchResources as any).mockResolvedValue([VIEW({ badge: "none", payload: { kind: "resource", targetId: SEED_ID, name: "Sketchy Tool", url: phishingUrl, resourceType: "link" } })]);

    const { container } = render(<ResourceList nodeId={SEED_ID} contributions={{}} setContributions={vi.fn()} />);

    expect(await screen.findByText("Sketchy Tool")).toBeInTheDocument();
    expect(container.querySelectorAll(`a[href="${phishingUrl}"]`)).toHaveLength(0);
    expect(screen.getByText(/URL \(in review\):/i)).toBeInTheDocument();
  });

  test("badge 'verified' + a url renders a clickable <a>", async () => {
    const goodUrl = "https://trustworthy.example.org/real";
    (fetchResources as any).mockResolvedValue([VIEW({ badge: "verified", status: "verified", payload: { kind: "resource", targetId: SEED_ID, name: "Good Tool", url: goodUrl, resourceType: "link" } })]);

    const { container } = render(<ResourceList nodeId={SEED_ID} contributions={{}} setContributions={vi.fn()} />);

    await screen.findByText("Good Tool");
    await waitFor(() => expect(container.querySelectorAll(`a[href="${goodUrl}"]`).length).toBeGreaterThan(0));
  });
});

describe("ResourceList — commercial marker (driven off reviewMeta)", () => {
  test("reviewMeta.commercial + unverified shows the '⏳ commercial — under review' marker", async () => {
    (fetchResources as any).mockResolvedValue([VIEW({ badge: "none", reviewMeta: { commercial: true }, payload: { kind: "resource", targetId: SEED_ID, name: "Paid Service", url: "https://paid.example.org/", resourceType: "product" } })]);

    render(<ResourceList nodeId={SEED_ID} contributions={{}} setContributions={vi.fn()} />);

    expect(await screen.findByText("Paid Service")).toBeInTheDocument();
    expect(screen.getByText(/commercial — under review/i)).toBeInTheDocument();
  });
});

describe("ResourceList — submit posts a resource and clears the form", () => {
  test("posts {kind:'resource', targetId, name, url, resourceType:'product'} and clears", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    (fetchResources as any).mockResolvedValue([]);
    render(<ResourceList nodeId={SEED_ID} contributions={{}} setContributions={vi.fn()} />);

    // open the form
    await user.click(screen.getByText(/suggest a tool \/ product/i));

    // pick the "Product / service" type
    await user.click(screen.getByRole("button", { name: /product \/ service/i }));

    const nameInput = screen.getByPlaceholderText(/name \(e\.g\./i) as HTMLInputElement;
    const urlInput = screen.getByPlaceholderText(/https/i) as HTMLInputElement;
    await user.type(nameInput, "My Product");
    await user.type(urlInput, "https://product.example.org/");

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => {
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "/api/contribute/submit",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const call = ((globalThis as any).fetch as any).mock.calls.find((c: any[]) => c[0] === "/api/contribute/submit");
    const body = JSON.parse(call[1].body);
    expect(body).toMatchObject({ kind: "resource", targetId: SEED_ID, name: "My Product", url: "https://product.example.org/", resourceType: "product" });

    // form clears after a successful submit (the box collapses)
    await waitFor(() => expect(screen.queryByPlaceholderText(/https/i)).not.toBeInTheDocument());
  });
});

describe("ResourceList — graceful degradation", () => {
  test("when fetchResources returns [] (backend down) the seed resources still render", async () => {
    (fetchResources as any).mockResolvedValue([]);
    render(<ResourceList nodeId={SEED_ID} contributions={{}} setContributions={vi.fn()} />);

    expect(screen.getByText("WHAT TO USE")).toBeInTheDocument();
    // network-privacy seed includes Mullvad VPN (from RESOURCES)
    expect(RESOURCES[SEED_ID]).toBeTruthy();
    expect(screen.getByText("Mullvad VPN")).toBeInTheDocument();
  });

  test("seed Amazon affiliate product cards render Amazon images and tagged links", () => {
    (fetchResources as any).mockResolvedValue([]);
    const { container } = render(<ResourceList nodeId="strong-2fa" contributions={{}} setContributions={vi.fn()} />);

    expect(screen.getByText("YubiKey 5C NFC")).toBeInTheDocument();
    expect(screen.getByText("OnlyKey FIDO2")).toBeInTheDocument();
    const yubiImage = screen.getByAltText("Amazon product image of YubiKey 5C NFC security key") as HTMLImageElement;
    expect(yubiImage.src).toContain("m.media-amazon.com/images/I/41DkFsG8yEL.jpg");
    const amazonLink = Array.from(container.querySelectorAll("a")).find((a) => a.textContent?.includes("YubiKey 5C NFC"));
    expect(amazonLink?.getAttribute("href")).toContain("tag=privacyatlas-20");
    expect(amazonLink?.getAttribute("href")).not.toContain("pa_affiliate");
  });
});

// Helper for affiliate tests — uses nodeId "n" which has NO seed resources so there
// is no seed-layer interference with the community-resource assertions.
const affiliateView = (over: any = {}): any => ({
  id: "r1",
  payload: { kind: "resource", targetId: "n", name: "Proton VPN", url: "https://protonvpn.com", resourceType: "product" },
  score: 0, badge: "verified", status: "verified", stale: false, reviewMeta: null,
  ...over,
});

describe("ResourceList — affiliate link", () => {
  test("uses reviewMeta.affiliate.url as the href + shows an affiliate tag when verified", async () => {
    (fetchResources as any).mockResolvedValue([affiliateView({ reviewMeta: { commercial: true, affiliate: { url: "https://protonvpn.com/?ref=privacyatlas" } } })]);
    const { container } = render(<ResourceList nodeId="n" contributions={{}} />);
    await waitFor(() => expect(container.querySelector('a[href="https://protonvpn.com/?ref=privacyatlas"]')).toBeTruthy());
    // exact match — the long AFFILIATE_DISCLOSURE sentence also contains "affiliate", so match the tag's exact text only
    expect(screen.getByText("affiliate")).toBeInTheDocument();
    expect(screen.getAllByText(/Some links may be affiliate links/i).length).toBeGreaterThan(0);
  });
  test("falls back to the plain url when there is no affiliate.url", async () => {
    (fetchResources as any).mockResolvedValue([affiliateView({ reviewMeta: { commercial: true } })]);
    const { container } = render(<ResourceList nodeId="n" contributions={{}} />);
    await waitFor(() => expect(container.querySelector('a[href="https://protonvpn.com"]')).toBeTruthy());
    expect(screen.queryByText("affiliate")).not.toBeInTheDocument();
  });
});
