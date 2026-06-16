import { expect, test } from "vitest";
import { buildModel } from "./model";

test("buildModel({}) exposes all/byId/links/adj over the seed graph", () => {
  const m = buildModel({});
  // 101 nodes + 33 threats — verified from data/graph.json
  expect(m.all.length).toBe(101 + 33);
  expect(m.byId.get("password-manager")).toBeTruthy();
  expect(m.adj.get("password-manager")).toBeInstanceOf(Set);
  expect(m.links.length).toBeGreaterThan(0);
});

/**
 * The real contributions shape (read from reference/PrivacyAtlas.jsx):
 *   contributions.proposedNodes = Array<{
 *     id: string;
 *     nodeKind: "move" | "threat";
 *     label: string;
 *     domain?: string;
 *     summary: string;
 *     honesty: string;
 *     rel: string[];            // related node/threat ids
 *     src: { url: string; title: string };
 *     ts: number;
 *     confirms: number;
 *     flags: number;
 *   }>
 *
 * entryStatus(e) === "verified" when:
 *   c >= t.promote && c >= f * 3
 *   where t.promote = 9 + (_h(e.id) % 8)  -> min 9, max 16
 *
 * To reliably force "verified" without computing _h, use confirms=20 and flags=0.
 * That satisfies c >= any value in [9..16] and c >= 0 * 3 = 0.
 */
test("verified community move proposal merges into the model with correct fields", () => {
  const base = buildModel({});
  const contributions: Parameters<typeof buildModel>[0] = {
    proposedNodes: [
      {
        id: "community-x",
        nodeKind: "move",          // non-threat → becomes a node
        label: "Community move",
        domain: "digital",
        summary: "A community-submitted privacy move for testing.",
        honesty: "Limited effectiveness in some regions.",
        rel: [],
        src: { url: "https://example.org", title: "Example source" },
        ts: Date.now(),
        confirms: 20,              // well above max promote bar (16)
        flags: 0,
      },
    ],
  };
  const m = buildModel(contributions);

  // Count: exactly one more item than the base model
  expect(m.all.length).toBe(base.all.length + 1);

  // The community node is findable by id
  const node = m.byId.get("community-x");
  expect(node).toBeTruthy();

  // Assert the actual merged field values
  expect(node).toMatchObject({
    id: "community-x",
    label: "Community move",
    kind: "node",
    tier: 3,
    community: true,
    domain: "digital",
    summary: "A community-submitted privacy move for testing.",
    caveat: "Limited effectiveness in some regions.",
    cost: { money: "low", friction: "med", maintenance: "periodic" },
  });
});

test("verified community threat proposal merges into the model with correct fields and edge polarity", () => {
  const base = buildModel({});
  // "password-manager" exists in GRAPH.nodes (confirmed from data/graph.json)
  const contributions: Parameters<typeof buildModel>[0] = {
    proposedNodes: [
      {
        id: "community-threat-y",
        nodeKind: "threat",
        label: "Community threat",
        domain: "behavioral",
        summary: "A community-submitted threat for testing.",
        honesty: "Residual risk remains in legacy systems.",
        rel: ["password-manager"],  // counter: password-manager counters this threat
        src: { url: "https://example.org/threat", title: "Threat source" },
        ts: Date.now(),
        confirms: 20,               // well above max promote bar (16)
        flags: 0,
      },
    ],
  };
  const m = buildModel(contributions);

  // Count: exactly one more item than the base model (a threat, not a node)
  expect(m.all.length).toBe(base.all.length + 1);

  // The community threat is findable by id
  const threat = m.byId.get("community-threat-y");
  expect(threat).toBeTruthy();

  // Assert the actual merged field values (threat branch)
  expect(threat).toMatchObject({
    id: "community-threat-y",
    label: "Community threat",
    kind: "threat",
    tier: 3,
    community: true,
    trajectory: "emerging",
    domain: "behavioral",
    counters: ["password-manager"],
    residual: "Residual risk remains in legacy systems.",
  });

  // Assert edge polarity: for a threat, edge is { from: rid, to: p.id }
  // i.e. the counter node (password-manager) → community threat (community-threat-y)
  const commLink = m.links.find(
    (l) => l.source === "password-manager" && l.target === "community-threat-y"
  );
  expect(commLink).toBeTruthy();

  // Confirm the reversed direction does NOT appear as a separate link for this pair
  const wrongDirection = m.links.find(
    (l) => l.source === "community-threat-y" && l.target === "password-manager"
  );
  expect(wrongDirection).toBeUndefined();
});
