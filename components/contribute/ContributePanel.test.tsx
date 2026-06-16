/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import ContributePanel from "./ContributePanel";
import { fetchNodeVoteState, castNodeVote } from "@/lib/contribute/vote-state";

// VoteControl (rendered per queued item) calls these. Mock so the queue cards
// render their score control without hitting the network.
vi.mock("@/lib/contribute/vote-state", () => ({
  fetchNodeVoteState: vi.fn(),
  castNodeVote: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Stub window.storage — ReviewControls calls window.storage.get on mount,
// and the domain-gap signal in ProposeNode still writes to it.
// ---------------------------------------------------------------------------
beforeAll(() => {
  (globalThis as any).window = (globalThis as any).window || {};
  (globalThis as any).window.storage = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  };
});

// ---------------------------------------------------------------------------
// The review queue is now API-driven (GET /api/contribute/list). Mock fetch
// per-test so we control what the queue renders. The localStorage model that
// these components used previously is gone; the props (contributions/byId) now
// only drive the session-stats line and the "your suggested sources" list.
// ---------------------------------------------------------------------------
function mockList(items: any[]) {
  (globalThis as any).fetch = vi.fn(async (url: string) => {
    if (typeof url === "string" && url.includes("/api/contribute/list")) {
      return { ok: true, json: async () => ({ items }) } as any;
    }
    return { ok: true, json: async () => ({}) } as any;
  });
}
function mockListFails() {
  (globalThis as any).fetch = vi.fn(async () => ({ ok: false, json: async () => ({}) }) as any);
}

const STATE = (over: any = {}) => ({ confirms: 0, flags: 0, score: 0, badge: "none", status: "pending", stale: false, ...over });

beforeEach(() => {
  mockList([]);
  // Default: VoteControl resolves a (zero) state so queue cards render their score
  // control fully. Individual tests override the resolved value as needed.
  (fetchNodeVoteState as any).mockReset().mockResolvedValue(STATE());
  (castNodeVote as any).mockReset().mockResolvedValue({ ok: true });
});
afterEach(() => vi.restoreAllMocks());

const emptyById = new Map<string, any>();

// ---------------------------------------------------------------------------
// Section renders
// ---------------------------------------------------------------------------
describe("ContributePanel — structure", () => {
  test("renders the seed/answer heading", () => {
    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/seed, not an answer/i);
  });

  test("renders all four ContribCard titles", () => {
    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    expect(screen.getByText(/Evidence-first edits/i)).toBeInTheDocument();
    expect(screen.getByText(/Review states/i)).toBeInTheDocument();
    expect(screen.getByText(/Agent \+ crowd/i)).toBeInTheDocument();
    expect(screen.getByText(/Versioned & reversible/i)).toBeInTheDocument();
  });

  test("renders session contribution stats line", () => {
    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    expect(screen.getByText(/Your local contributions this session/i)).toBeInTheDocument();
    expect(screen.getByText("0 sources")).toBeInTheDocument();
    expect(screen.getByText("0 edits")).toBeInTheDocument();
  });

  test("renders empty review queue message when the API returns no items", async () => {
    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    expect(await screen.findByText(/REVIEW QUEUE — empty/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Wallet sign-in
// ---------------------------------------------------------------------------
describe("ContributePanel — wallet sign-in", () => {
  test("renders a connect-wallet button when not signed in", () => {
    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ProposeNode renders within ContributePanel
// ---------------------------------------------------------------------------
describe("ContributePanel — ProposeNode integration", () => {
  test("ProposeNode section heading is present", () => {
    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    expect(screen.getByText(/PROPOSE A NEW NODE/i)).toBeInTheDocument();
  });

  test("propose button is present", () => {
    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    expect(screen.getByRole("button", { name: /propose it/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MachineAccess renders (real component, not stub)
// ---------------------------------------------------------------------------
describe("ContributePanel — MachineAccess", () => {
  test("renders the AI & MACHINE ACCESS section (stub replaced by real component)", () => {
    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    expect(screen.getByText(/AI & MACHINE ACCESS/i)).toBeInTheDocument();
  });

  test("does NOT have a data-stub='MachineAccess' element (stub is gone)", () => {
    const { container } = render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    const stub = container.querySelector("[data-stub='MachineAccess']");
    expect(stub).toBeNull();
  });

  test("renders the export buttons within ContributePanel", () => {
    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    expect(screen.getByRole("button", { name: /full JSON knowledge base/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /llms\.txt \(markdown index\)/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// PHISHING GUARD: a pending proposal's src.url must render as PLAIN TEXT, not <a>
// ---------------------------------------------------------------------------
describe("ContributePanel — PHISHING GUARD (pending source URL is plain text)", () => {
  test("a pending node proposal's src.url renders as plain text, NOT as a clickable <a>", async () => {
    const phishingUrl = "https://attacker.example.org/fake-source";
    mockList([
      {
        id: "node-test-002",
        status: "pending",
        badge: "none",
        confirms: 0,
        flags: 0,
        ts: Date.now(),
        payload: {
          nodeKind: "move",
          label: "Malicious proposal",
          domain: "digital",
          summary: "A fake move to test the phishing guard in node proposals.",
          honesty: "No real caveat needed for test.",
          src: { url: phishingUrl, title: "Fake source" },
        },
      },
    ]);

    const { container } = render(
      <ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />
    );

    // The URL text must appear somewhere in the DOM
    expect(await screen.findByText(phishingUrl)).toBeInTheDocument();
    // It must NOT be a clickable link while pending
    const anchors = container.querySelectorAll(`a[href="${phishingUrl}"]`);
    expect(anchors).toHaveLength(0);
    // The "claimed source (verify)" copy should appear
    expect(screen.getByText(/claimed source \(verify\)/i)).toBeInTheDocument();
  });

  test("a VERIFIED proposal's src.url DOES render as a clickable <a>", async () => {
    const goodUrl = "https://trustworthy.example.org/real-source";
    // VoteControl reads the live badge; make it verified so the card's ✓ badge matches the item intent.
    (fetchNodeVoteState as any).mockResolvedValue(
      STATE({ confirms: 12, flags: 0, score: 12, badge: "verified", status: "verified" }),
    );
    mockList([
      {
        id: "node-verified-001",
        status: "verified",
        badge: "verified",
        confirms: 12,
        flags: 0,
        ts: Date.now(),
        payload: {
          nodeKind: "move",
          label: "Verified proposal",
          domain: "digital",
          summary: "A verified move whose source becomes a real link once promoted.",
          honesty: "Caveat: only covers this one platform.",
          src: { url: goodUrl, title: "Real source" },
        },
      },
    ]);

    const { container } = render(
      <ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />
    );

    await screen.findByText(/Verified proposal/i);
    const anchors = container.querySelectorAll(`a[href="${goodUrl}"]`);
    expect(anchors.length).toBeGreaterThan(0);
  });

  test("votes alone do NOT confer trust: status 'verified' + badge 'none' shows no link and no ✓ verified", async () => {
    const voteOnlyUrl = "https://vote-only.example.org/unverified-source";
    // VoteControl's live badge is "none" here, so it renders no ✓ verified despite the vote tally.
    (fetchNodeVoteState as any).mockResolvedValue(
      STATE({ confirms: 99, flags: 0, score: 99, badge: "none", status: "verified" }),
    );
    mockList([
      {
        id: "node-vote-only-001",
        status: "verified",
        badge: "none",
        confirms: 99,
        flags: 0,
        ts: Date.now(),
        payload: {
          nodeKind: "move",
          label: "Vote-only proposal",
          domain: "digital",
          summary: "A move with many confirm votes but no AI maintainer verification.",
          honesty: "Caveat: trust must come from the maintainer badge, not the tally.",
          src: { url: voteOnlyUrl, title: "Vote-only source" },
        },
      },
    ]);

    const { container } = render(
      <ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />
    );

    await screen.findByText(/Vote-only proposal/i);
    // no clickable source link — votes don't promote the source to a link
    const anchors = container.querySelectorAll(`a[href="${voteOnlyUrl}"]`);
    expect(anchors).toHaveLength(0);
    // no ✓ verified badge — that comes only from the AI maintainer badge
    expect(screen.queryByText(/✓ verified/)).not.toBeInTheDocument();
    // it still shows the unverified "claimed source" copy
    expect(screen.getByText(/claimed source \(verify\)/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Review queue populates from the API
// ---------------------------------------------------------------------------
describe("ContributePanel — review queue with items", () => {
  test("shows REVIEW QUEUE header + 'in review' framing when there are pending entries", async () => {
    mockList([
      {
        id: "node-rq-001",
        status: "pending",
        confirms: 0,
        flags: 0,
        ts: Date.now(),
        payload: {
          nodeKind: "threat",
          label: "Smart-TV ambient listening",
          domain: "digital",
          summary: "Threat summary that is long enough to look like a real proposal entry.",
          honesty: "Residual: still captured by the TV vendor's mic firmware.",
        },
      },
    ]);

    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);

    await screen.findByText(/Smart-TV ambient listening/i);
    expect(await screen.findByText(/REVIEW QUEUE/i)).toBeInTheDocument();
    expect(screen.getByText(/in review/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart-TV ambient listening/i)).toBeInTheDocument();
    // never shows raw counts/bars
    expect(screen.queryByText(/confirms/i)).not.toBeInTheDocument();
    // empty message must be gone
    expect(screen.queryByText(/REVIEW QUEUE — empty/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Graceful degradation when the contribution service is unavailable
// ---------------------------------------------------------------------------
describe("ContributePanel — degrades gracefully", () => {
  test("shows 'contribution service unavailable' when /list fails", async () => {
    mockListFails();
    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    expect(await screen.findByText(/Contribution service unavailable/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Suggested sources section (still driven by shared-storage contributions prop)
// ---------------------------------------------------------------------------
describe("ContributePanel — suggested sources", () => {
  test("YOUR SUGGESTED SOURCES section appears when sources are present", () => {
    const contributions = {
      sources: {
        "password-manager": [{ kind: "primary", title: "Bitwarden overview", url: "https://bitwarden.com" }],
      },
    };
    const byId = new Map<string, any>([["password-manager", { label: "Password manager" }]]);

    render(<ContributePanel contributions={contributions} setContributions={vi.fn()} byId={byId} />);

    expect(screen.getByText(/YOUR SUGGESTED SOURCES/i)).toBeInTheDocument();
    expect(screen.getByText(/Password manager.*Bitwarden overview/)).toBeInTheDocument();
  });

  test("YOUR SUGGESTED SOURCES section is absent when sources are empty", () => {
    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);
    expect(screen.queryByText(/YOUR SUGGESTED SOURCES/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// The queue now renders the unified VoteControl per item (replacing the bespoke
// ReviewControls). Voting flows through the mocked vote-state util, so we assert
// the control renders (net score) and that 👍 calls castNodeVote(id, "confirm").
// ---------------------------------------------------------------------------
describe("ContributePanel — unified VoteControl in the queue", () => {
  const queueItem = {
    id: "node-vote-001",
    status: "pending",
    confirms: 0,
    flags: 0,
    ts: Date.now(),
    payload: {
      nodeKind: "move",
      label: "Vote target move",
      domain: "digital",
      summary: "A move long enough to render and receive a vote in the queue.",
      honesty: "Caveat: this is a test fixture only.",
    },
  };

  test("renders a VoteControl (net score + thumbs) for a queued item", async () => {
    mockList([queueItem]);
    (fetchNodeVoteState as any).mockResolvedValue(
      STATE({ confirms: 7, flags: 2, score: 5 }),
    );

    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);

    await screen.findByText(/Vote target move/i);
    // the unified control's thumbs render…
    expect(await screen.findByRole("button", { name: /thumbs up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /thumbs down/i })).toBeInTheDocument();
    // …and the net community score (confirms − flags) shows
    expect(screen.getByText("5")).toBeInTheDocument();
    // the old bespoke ReviewControls copy is gone
    expect(screen.queryByRole("button", { name: /belongs on the map/i })).toBeNull();
  });

  test("clicking 👍 calls castNodeVote(itemId, 'confirm')", async () => {
    mockList([queueItem]);
    (fetchNodeVoteState as any).mockResolvedValue(STATE({ confirms: 3, flags: 0, score: 3 }));

    render(<ContributePanel contributions={{}} setContributions={vi.fn()} byId={emptyById} />);

    const up = await screen.findByRole("button", { name: /thumbs up/i });
    up.click();

    await waitFor(() => {
      expect(castNodeVote).toHaveBeenCalledWith("node-vote-001", "confirm");
    });
  });
});
