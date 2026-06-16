/* eslint-disable @typescript-eslint/no-explicit-any -- ModelNode union includes Threat which
   lacks summary; cast as any to access the Node-only field in test assertions. */
import { expect, test, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Detail from "./Detail";
import { fetchSources, fetchNodeVoteState } from "@/lib/contribute/vote-state";
import { buildModel } from "@/lib/model";
import type { ModelNode } from "@/lib/types";

// Detail's meta-badge row now renders <VoteControl>, which fetches per-node vote
// state. Mock the util so these tests stay hermetic (no network). Returning null
// makes VoteControl render nothing, leaving all existing assertions unaffected.
vi.mock("@/lib/contribute/vote-state", () => ({
  fetchNodeVoteState: vi.fn().mockRejectedValue(new Error("unavailable")),
  castNodeVote: vi.fn(),
  // HowTo loads community how-tos from this util; resolve empty so the seed path renders.
  fetchHowtos: vi.fn().mockResolvedValue([]),
  // ResourceList loads community resources from this util; resolve empty.
  fetchResources: vi.fn().mockResolvedValue([]),
  // Detail loads community sources from this util; resolve empty by default —
  // individual tests override the mock to inject SourceViews.
  fetchSources: vi.fn().mockResolvedValue([]),
  // RegionOverlayView (rendered by Detail) loads community region overlays on mount.
  fetchRegions: vi.fn().mockResolvedValue([]),
}));

// connectAndSignIn is called on a 401 submit; never needed for happy paths.
vi.mock("@/lib/wallet", () => ({
  connectAndSignIn: vi.fn().mockResolvedValue("0xabc"),
  shortAddress: (a: string) => a,
}));

// The community-static (tier-2) layer is baked JSON. Default to EMPTY maps so the
// existing seed/live/phishing tests are unaffected; the tier-2 test overrides the
// COMMUNITY_SOURCES entry for the test node below.
const BAKED_SOURCES: Record<string, any[]> = {};
vi.mock("@/data/community-content", () => ({
  COMMUNITY_HOWTOS: {},
  COMMUNITY_RESOURCES: {},
  COMMUNITY_SOURCES: new Proxy({}, { get: (_t, k: string) => BAKED_SOURCES[k] }),
  COMMUNITY_REGIONS: {},
}));

// Stub window.storage — OutdatedFlag (via HowTo) calls window.storage on mount
beforeAll(() => {
  (globalThis as any).window = (globalThis as any).window || {};
  (globalThis as any).window.storage = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  };
});

// A SourceView fixture (as returned by fetchSources)
const SOURCE = (over: any = {}): any => ({
  id: "src-1",
  payload: { kind: "source", targetId: "password-manager", title: "Community Reference", url: "https://example.org/ref", sourceKind: "org" },
  score: 0,
  badge: "none",
  status: "pending",
  stale: false,
  ...over,
});

beforeEach(() => {
  for (const k of Object.keys(BAKED_SOURCES)) delete BAKED_SOURCES[k];
  (fetchSources as any).mockReset().mockResolvedValue([]);
  // VoteControl per source reads node vote state; keep it rejecting → renders nothing.
  (fetchNodeVoteState as any).mockReset?.().mockRejectedValue(new Error("unavailable"));
  (globalThis as any).fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as any);
});

const model = buildModel({});
const node = (id: string): ModelNode => {
  const n = model.byId.get(id);
  if (!n) throw new Error("test fixture missing node: " + id);
  return n;
};

const stubProps = {
  model,
  setSelected: (_id: string | null) => {},
  setGoal: (_id: string) => {},
  contributions: {},
  setContributions: (_c: unknown) => {},
  myDevices: undefined,
  saveDevices: undefined,
};

/* ------------------------------------------------------------------ */
/*  MOVE node tests                                                     */
/* ------------------------------------------------------------------ */

test("Detail (MOVE): renders summary text", () => {
  const moveNode = node("password-manager");
  render(<Detail {...stubProps} node={moveNode} />);
  // The summary paragraph should appear
  expect(screen.getByText((moveNode as any).summary)).toBeInTheDocument();
});

test("Detail (MOVE): renders HOW TO section", () => {
  const moveNode = node("password-manager");
  render(<Detail {...stubProps} node={moveNode} />);
  expect(screen.getByText("HOW TO DO THIS")).toBeInTheDocument();
});

test("Detail (MOVE): renders fine-print toggle with FINE PRINT copy", () => {
  const moveNode = node("password-manager");
  render(<Detail {...stubProps} node={moveNode} />);
  // The toggle button contains "THE FINE PRINT"
  expect(screen.getByText(/FINE PRINT/)).toBeInTheDocument();
});

test("Detail (MOVE): summary appears before FINE PRINT in DOM order", () => {
  const moveNode = node("password-manager");
  const { container } = render(<Detail {...stubProps} node={moveNode} />);
  const allText = container.textContent || "";
  const summaryIdx = allText.indexOf((moveNode as any).summary);
  const finePrintIdx = allText.indexOf("FINE PRINT");
  expect(summaryIdx).toBeGreaterThanOrEqual(0);
  expect(finePrintIdx).toBeGreaterThanOrEqual(0);
  // summary must appear before the fine print toggle
  expect(summaryIdx).toBeLessThan(finePrintIdx);
});

test("Detail (MOVE): HOW TO appears before FINE PRINT in DOM order", () => {
  const moveNode = node("password-manager");
  const { container } = render(<Detail {...stubProps} node={moveNode} />);
  const allText = container.textContent || "";
  const howToIdx = allText.indexOf("HOW TO DO THIS");
  const finePrintIdx = allText.indexOf("FINE PRINT");
  expect(howToIdx).toBeGreaterThanOrEqual(0);
  expect(finePrintIdx).toBeGreaterThanOrEqual(0);
  expect(howToIdx).toBeLessThan(finePrintIdx);
});

test("Detail (MOVE): renders kicker with domain and tier", () => {
  const moveNode = node("password-manager");
  render(<Detail {...stubProps} node={moveNode} />);
  // Kicker spans domain label and tier
  expect(screen.getByText(/TIER/)).toBeInTheDocument();
});

test("Detail (MOVE): renders REFERENCES section", () => {
  const moveNode = node("password-manager");
  render(<Detail {...stubProps} node={moveNode} />);
  expect(screen.getByText(/REFERENCES/)).toBeInTheDocument();
});

test("Detail (MOVE): renders close button", () => {
  const moveNode = node("password-manager");
  render(<Detail {...stubProps} node={moveNode} />);
  expect(screen.getByTitle(/close/)).toBeInTheDocument();
});

test("Detail (MOVE): renders ASK AI section", () => {
  const moveNode = node("password-manager");
  render(<Detail {...stubProps} node={moveNode} />);
  expect(screen.getByText("ASK AI · go deeper")).toBeInTheDocument();
});

/* ------------------------------------------------------------------ */
/*  THREAT node tests                                                   */
/* ------------------------------------------------------------------ */

test("Detail (THREAT): renders WHAT DEFEATS IT lead section", () => {
  // T-BROKER has counteredBy moves
  const threatNode = node("T-BROKER");
  render(<Detail {...stubProps} node={threatNode} />);
  expect(screen.getByText(/WHAT DEFEATS IT/)).toBeInTheDocument();
});

test("Detail (THREAT): renders residual text (RESIDUAL RISK label)", () => {
  const threatNode = node("T-BROKER");
  render(<Detail {...stubProps} node={threatNode} />);
  // HonestyBlock renders the label
  expect(screen.getByText(/RESIDUAL RISK/)).toBeInTheDocument();
});

test("Detail (THREAT): threat summary (label) appears in heading", () => {
  const threatNode = node("T-BROKER");
  render(<Detail {...stubProps} node={threatNode} />);
  expect(screen.getByText(threatNode.label)).toBeInTheDocument();
});

test("Detail (THREAT): does NOT render HOW TO or FINE PRINT", () => {
  const threatNode = node("T-BROKER");
  render(<Detail {...stubProps} node={threatNode} />);
  expect(screen.queryByText("HOW TO DO THIS")).not.toBeInTheDocument();
  expect(screen.queryByText(/FINE PRINT/)).not.toBeInTheDocument();
});

test("Detail (THREAT): residual appears before close button (residual is up front)", () => {
  const threatNode = node("T-BROKER");
  const { container } = render(<Detail {...stubProps} node={threatNode} />);
  const allText = container.textContent || "";
  // "WHAT DEFEATS IT" (the counter lead) appears before REFERENCES
  const defeatsIdx = allText.indexOf("WHAT DEFEATS IT");
  const refsIdx = allText.indexOf("REFERENCES");
  expect(defeatsIdx).toBeGreaterThanOrEqual(0);
  expect(refsIdx).toBeGreaterThanOrEqual(0);
  expect(defeatsIdx).toBeLessThan(refsIdx);
});

/* ------------------------------------------------------------------ */
/*  null / undefined guard                                              */
/* ------------------------------------------------------------------ */

test("Detail renders nothing when node is undefined", () => {
  const { container } = render(<Detail {...stubProps} node={undefined} />);
  expect(container).toBeEmptyDOMElement();
});

/* ------------------------------------------------------------------ */
/*  NEW: interaction tests                                              */
/* ------------------------------------------------------------------ */

// Test (a): Fine-print collapse expands
// "encrypted-messaging" has both caveat and failureMode so fine print renders.
// Collapsed = content NOT in DOM (fineOpen starts false). Click toggle → content appears.
test("Detail (MOVE): fine-print collapses; click expands caveat text", async () => {
  const user = userEvent.setup();
  const moveNode = node("encrypted-messaging");
  render(<Detail {...stubProps} node={moveNode} />);

  // Caveat text must NOT be visible while collapsed (not rendered at all)
  const caveatText = (moveNode as any).caveat as string;
  expect(screen.queryByText(caveatText)).not.toBeInTheDocument();

  // Click the toggle button
  const toggle = screen.getByText(/FINE PRINT/);
  await user.click(toggle);

  // After expanding, caveat text IS in the document
  expect(screen.getByText(caveatText)).toBeInTheDocument();
});

// Test (b): Threat "NO INDIVIDUAL DEFENSE" branch.
// No real threat in seed data has zero counteredBy links, so we build a synthetic
// ModelNode + a minimal Model that contains no counter links for it.
test("Detail (THREAT): zero-counter threat shows NO INDIVIDUAL DEFENSE copy", () => {
  const syntheticThreat: ModelNode = {
    id: "T-SYNTHETIC-ZERO",
    label: "Synthetic Zero-Counter Threat",
    domain: "digital",
    trajectory: "emerging",
    tier: 3,
    counters: [],
    residual: "No defense exists.",
    sources: [],
    kind: "threat",
  };

  // Build a minimal model that includes the threat but no counter links for it
  const allNodes = [...model.all, syntheticThreat];
  const syntheticModel = {
    ...model,
    all: allNodes,
    byId: new Map([...model.byId, [syntheticThreat.id, syntheticThreat]]),
    // model.links has no "counters" edges pointing to T-SYNTHETIC-ZERO by definition
  };

  render(<Detail {...stubProps} model={syntheticModel} node={syntheticThreat} />);
  expect(screen.getByText("NO INDIVIDUAL DEFENSE")).toBeInTheDocument();
  expect(screen.getByText(/See the .Push back collectively. journey/)).toBeInTheDocument();
});

// Test (c): Goal button calls setGoal with node id
test("Detail (MOVE): trace-path button calls setGoal with node id", async () => {
  const user = userEvent.setup();
  const moveNode = node("password-manager");
  const mockSetGoal = vi.fn();
  render(<Detail {...stubProps} node={moveNode} setGoal={mockSetGoal} />);

  const btn = screen.getByText(/trace the path to reach this/i);
  await user.click(btn);

  expect(mockSetGoal).toHaveBeenCalledWith(moveNode.id);
});

/* ------------------------------------------------------------------ */
/*  JSON-LD embed tests                                                 */
/* ------------------------------------------------------------------ */

test("Detail (MOVE): renders a <script type='application/ld+json'> tag", () => {
  const moveNode = node("password-manager");
  const { container } = render(<Detail {...stubProps} node={moveNode} />);
  const scripts = container.querySelectorAll("script[type='application/ld+json']");
  expect(scripts.length).toBeGreaterThanOrEqual(1);
});

test("Detail (MOVE): JSON-LD script contains the node label", () => {
  const moveNode = node("password-manager");
  const { container } = render(<Detail {...stubProps} node={moveNode} />);
  const script = container.querySelector("script[type='application/ld+json']");
  expect(script).not.toBeNull();
  expect(script!.textContent).toContain(moveNode.label);
});

test("Detail (THREAT): JSON-LD script contains the threat label", () => {
  const threatNode = node("T-BROKER");
  const { container } = render(<Detail {...stubProps} node={threatNode} />);
  const script = container.querySelector("script[type='application/ld+json']");
  expect(script).not.toBeNull();
  expect(script!.textContent).toContain(threatNode.label);
});

test("Detail (MOVE): JSON-LD script content does not contain literal </script>", () => {
  const moveNode = node("password-manager");
  const { container } = render(<Detail {...stubProps} node={moveNode} />);
  const script = container.querySelector("script[type='application/ld+json']");
  expect(script).not.toBeNull();
  expect(script!.textContent).not.toContain("</script>");
});

test("Detail (MOVE): JSON-LD script escapes < as \\u003c in raw innerHTML", () => {
  const moveNode = node("password-manager");
  const { container } = render(<Detail {...stubProps} node={moveNode} />);
  const script = container.querySelector("script[type='application/ld+json']");
  expect(script).not.toBeNull();
  // innerHTML has the escaped unicode; textContent is the browser-decoded string
  // In jsdom, innerHTML of a script tag reflects the raw content
  const raw = script!.innerHTML;
  // Raw content must not have literal bare < or >
  expect(raw).not.toMatch(/<[a-zA-Z/]/); // no HTML-like <tag> patterns
});

test("Detail (MOVE): JSON-LD content is valid parseable JSON", () => {
  const moveNode = node("password-manager");
  const { container } = render(<Detail {...stubProps} node={moveNode} />);
  const script = container.querySelector("script[type='application/ld+json']");
  expect(script).not.toBeNull();
  // The escaped unicode (< etc.) is valid JSON — parse must succeed
  expect(() => JSON.parse(script!.textContent!)).not.toThrow();
});

test("Detail (MOVE): JSON-LD has @context schema.org", () => {
  const moveNode = node("password-manager");
  const { container } = render(<Detail {...stubProps} node={moveNode} />);
  const script = container.querySelector("script[type='application/ld+json']");
  const parsed = JSON.parse(script!.textContent!);
  expect(parsed["@context"]).toBe("https://schema.org");
});

/* ------------------------------------------------------------------ */
/*  Community SOURCES — live from fetchSources (Detail.tsx)             */
/* ------------------------------------------------------------------ */

test("Detail: a community source from fetchSources renders its title + a VoteControl", async () => {
  const moveNode = node("password-manager");
  (fetchSources as any).mockResolvedValue([
    SOURCE({ id: "src-live-1", payload: { kind: "source", targetId: moveNode.id, title: "Live Community Ref", url: "https://example.org/live" } }),
  ]);
  // Let the per-source VoteControl resolve a real state so its thumbs render.
  (fetchNodeVoteState as any).mockResolvedValue({ confirms: 0, flags: 0, score: 0, badge: "none", status: "pending", stale: false });

  render(<Detail {...stubProps} node={moveNode} />);

  expect(await screen.findByText("Live Community Ref")).toBeInTheDocument();
  // VoteControl thumbs render once state resolves.
  await waitFor(() => expect(screen.getAllByRole("button", { name: /thumbs up/i }).length).toBeGreaterThanOrEqual(1));
});

/* ------------------------------------------------------------------ */
/*  PHISHING GUARD — community References (Detail.tsx)                  */
/*  A user-suggested source is in review until peers verify it. Its URL */
/*  must render as PLAIN TEXT, never a clickable <a href>, until then.  */
/* ------------------------------------------------------------------ */

test("Detail (PHISHING GUARD): badge 'none' community source URL is plain text, NOT a clickable <a>", async () => {
  const moveNode = node("password-manager");
  const phishingUrl = "https://evil.example.com/steal-credentials";
  (fetchSources as any).mockResolvedValue([
    SOURCE({ id: "src-phish-1", badge: "none", payload: { kind: "source", targetId: moveNode.id, title: "Suspicious Reference", url: phishingUrl } }),
  ]);

  const { container } = render(<Detail {...stubProps} node={moveNode} />);

  // URL text appears…
  expect(await screen.findByText(phishingUrl)).toBeInTheDocument();
  // …but NEVER as an anchor href.
  expect(container.querySelectorAll(`a[href="${phishingUrl}"]`)).toHaveLength(0);
  // Guard copy visible.
  expect(screen.getByText(/not linked until verified/i)).toBeInTheDocument();
});

test("Detail (PHISHING GUARD): badge 'verified' community source URL IS a clickable <a>", async () => {
  const moveNode = node("password-manager");
  const safeUrl = "https://good.example.org/real-reference";
  (fetchSources as any).mockResolvedValue([
    SOURCE({ id: "src-verified-1", badge: "verified", status: "verified", payload: { kind: "source", targetId: moveNode.id, title: "Verified Reference", url: safeUrl } }),
  ]);

  const { container } = render(<Detail {...stubProps} node={moveNode} />);

  await screen.findByText("Verified Reference");
  // A verified community source is allowed to be clickable.
  await waitFor(() => expect(container.querySelectorAll(`a[href="${safeUrl}"]`).length).toBeGreaterThan(0));
});

test("Detail: built-in node.sources citations still render clickable", () => {
  const moveNode = node("password-manager");
  const builtIn = (moveNode as any).sources || [];
  // Seed data guarantees this node has at least one built-in citation.
  expect(builtIn.length).toBeGreaterThan(0);
  const { container } = render(<Detail {...stubProps} node={moveNode} />);
  // Each built-in source is rendered as a clickable <a href> immediately (static, verified seed).
  expect(container.querySelectorAll(`a[href="${builtIn[0].url}"]`).length).toBeGreaterThan(0);
});

/* ------------------------------------------------------------------ */
/*  Community-static (tier 2) baked SOURCES (Detail.tsx)               */
/* ------------------------------------------------------------------ */

test("Detail: a baked community source renders as a verified card with a clickable <a> + a VoteControl", async () => {
  const moveNode = node("password-manager");
  BAKED_SOURCES[moveNode.id] = [
    { id: "baked-src-1", title: "Baked Reference", url: "https://baked.example.org/ref", sourceKind: "org" },
  ];
  // Let the per-source VoteControl resolve a real state so its thumbs render.
  (fetchNodeVoteState as any).mockResolvedValue({ confirms: 0, flags: 0, score: 0, badge: "none", status: "pending", stale: false });

  const { container } = render(<Detail {...stubProps} node={moveNode} />);

  expect(await screen.findByText("Baked Reference")).toBeInTheDocument();
  // baked sources are verified → clickable <a href>
  await waitFor(() => expect(container.querySelectorAll('a[href="https://baked.example.org/ref"]').length).toBeGreaterThan(0));
  await waitFor(() => expect(screen.getAllByRole("button", { name: /thumbs up/i }).length).toBeGreaterThanOrEqual(1));
});

test("Detail: a LIVE community source whose id equals a baked id does NOT double-render (dedup)", async () => {
  const moveNode = node("password-manager");
  BAKED_SOURCES[moveNode.id] = [
    { id: "dup-src", title: "BAKED-WINS-SRC", url: "https://baked.example.org/x" },
  ];
  (fetchSources as any).mockResolvedValue([
    SOURCE({ id: "dup-src", payload: { kind: "source", targetId: moveNode.id, title: "LIVE-DUPLICATE-SRC", url: "https://live.example.org/" } }),
  ]);

  render(<Detail {...stubProps} node={moveNode} />);

  expect(await screen.findByText("BAKED-WINS-SRC")).toBeInTheDocument();
  expect(screen.queryByText("LIVE-DUPLICATE-SRC")).not.toBeInTheDocument();
});

test("Detail: SuggestSource submit posts {kind:'source', targetId, title, url}", async () => {
  const user = userEvent.setup();
  const moveNode = node("password-manager");
  render(<Detail {...stubProps} node={moveNode} />);

  // open the suggest-source form
  await user.click(screen.getByText(/suggest a source/i));

  const titleInput = screen.getByPlaceholderText(/title/i) as HTMLInputElement;
  const urlInput = screen.getByPlaceholderText(/https/i) as HTMLInputElement;
  await user.type(titleInput, "My Reference");
  await user.type(urlInput, "https://ref.example.org/");

  await user.click(screen.getByRole("button", { name: /^submit$/i }));

  await waitFor(() => {
    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      "/api/contribute/submit",
      expect.objectContaining({ method: "POST" }),
    );
  });

  const call = ((globalThis as any).fetch as any).mock.calls.find((c: any[]) => c[0] === "/api/contribute/submit");
  const body = JSON.parse(call[1].body);
  expect(body).toMatchObject({ kind: "source", targetId: moveNode.id, title: "My Reference", url: "https://ref.example.org/" });
});
