/**
 * lib/path.ts — Path builder + prereq chain for Privacy Atlas.
 *
 * Ported VERBATIM from reference/PrivacyAtlas.jsx (L56–L79, L82–L134, L166–L182).
 * Pure functions — no DOM, no React, no storage.
 *
 * Key exports:
 *   buildPath(profile)         — dependency-ordered, foundation-biased path for a profile
 *   prereqChain(targetId, links) — walk prereq edges backward from a target node
 */

import { GRAPH } from "@/data/graph";
import { TRAJ_W, MONEY_PEN, FRIC_PEN } from "@/data/ui-maps";
import type { Node, Threat, ModelLink } from "@/lib/types";

/** Sentinel boost that guarantees update-discipline lands first when the phone is at-risk
 *  (far above any calibrated orderVal in the graph). */
const PHONE_ATRISK_BOOST = 100;

/* ------------------------------------------------------------------ */
/*  Internal helpers (L56–L79)                                         */
/* ------------------------------------------------------------------ */

/** Build index: nodeId → threat objects it counters (L56). */
function countersIndex(): Map<string, Threat[]> {
  const tById = new Map(GRAPH.threats.map((t) => [t.id, t]));
  const idx = new Map<string, Threat[]>();
  GRAPH.edges.forEach((e) => {
    if (e.type === "counters" && tById.has(e.to)) {
      if (!idx.has(e.from)) idx.set(e.from, []);
      idx.get(e.from)!.push(tById.get(e.to)!);
    }
  });
  return idx;
}

/** Urgency = sum of trajectory weight of countered threats (L69). */
function urgencyOf(nodeId: string, cidx: Map<string, Threat[]>): number {
  return (cidx.get(nodeId) || []).reduce(
    (s, t) => s + (TRAJ_W[t.trajectory] ?? 1),
    0
  );
}

/** Realistic, personalized score: leverage + urgency + actor-relevance − cost (L74). */
function scoreNode(
  n: Node,
  cidx: Map<string, Threat[]>,
  actorSet: Set<string> | null
): number {
  const urgency = urgencyOf(n.id, cidx);
  const actorBoost =
    actorSet && (n.actors || []).some((a) => actorSet.has(a)) ? 4 : 0;
  const cost = n.cost
    ? (MONEY_PEN[n.cost.money] || 0) + (FRIC_PEN[n.cost.friction] || 0)
    : 0;
  return (n.weight || 1) * 2 + urgency * 1.3 + actorBoost - cost;
}

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface PathProfile {
  /** Onboarding worry key — stored for display; actors resolved separately. */
  worry?: string;
  /** Onboarding friction tolerance: "none" | "low" | "med" | "high" */
  friction?: string;
  /** Skill level — "beginner" | "intermediate" | "advanced" */
  level?: string;
  /** Resolved actor ids (set by onboarding from WORRY[worry].actors). */
  actors?: string[];
  /** Optional domain filter (null or empty = all domains). */
  domains?: string[] | null;
  /** Timestamp (ms) when the profile was created (set by Onboarding). */
  created?: number;
  /** Onboarding phone-age bucket: "lt2" | "2to4" | "4plus" | "unknown". */
  phoneAge?: string;
}

/** Coarse phone-support state derived from the onboarding age bucket. */
export type PhoneStatus = "atrisk" | "uncertain" | "ok" | "none";
export function phoneStatus(profile: { phoneAge?: string }): PhoneStatus {
  switch (profile.phoneAge) {
    case "4plus":   return "atrisk";    // likely unsupported → full treatment
    case "unknown": return "uncertain"; // soft "check it" treatment
    case "lt2":
    case "2to4":    return "ok";
    default:        return "none";      // not answered
  }
}

export interface PathEntry {
  node: Node;
  score: number;
  urgency: number;
  counters: Threat[];
  assumedDone: boolean;
}

export interface PrereqChainResult {
  /** Set of all prerequisite node ids (any depth). */
  set: Set<string>;
  /** Topological order: deepest prereqs first, direct prereqs last. */
  order: string[];
}

/* ------------------------------------------------------------------ */
/*  buildPath (L82)                                                    */
/* ------------------------------------------------------------------ */

/**
 * Build a sequenced, prerequisite-respecting recommended path for a profile.
 *
 * Returns PathEntry[] — each item has `.node` (the Node object), `.score`,
 * `.urgency`, `.counters` (threat objects), and `.assumedDone` (always false
 * for emitted items — foundation tier-1 for advanced users are pre-placed as
 * "done" so they are skipped, not surfaced as assumedDone).
 *
 * Ordering:
 *   - Prereqs are respected: a node only appears after all its prerequisites.
 *   - Foundation moves and lower-tier moves get a bias boost so they surface
 *     before advanced moves even when a deep move scores highly.
 *   - Among ready nodes, highest orderVal wins.
 */
export function buildPath(profile: PathProfile): PathEntry[] {
  const cidx = countersIndex();
  const actorSet = profile.actors ? new Set(profile.actors) : null;
  const fricRank: Record<string, number> = { none: 0, low: 1, med: 2, high: 3 };
  const fricCap = fricRank[profile.friction ?? "high"];
  const phoneAtRisk = phoneStatus(profile) === "atrisk";

  const nodes = GRAPH.nodes.filter((n) => {
    if (n.actionability === "trap") return false; // never "recommend" a trap
    if (n.cost && fricRank[n.cost.friction] > fricCap) return false;
    if (
      profile.domains &&
      profile.domains.length &&
      !profile.domains.includes(n.domain)
    )
      return false;
    return true;
  });

  const inSet = new Set(nodes.map((n) => n.id));
  // byId unused in original path but kept for parity with the prototype's local var
  // const byId = new Map(nodes.map((n) => [n.id, n]));

  // prereqs among the candidate set
  const prereqs = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  GRAPH.edges.forEach((e) => {
    if (e.type === "prereq" && inSet.has(e.from) && inSet.has(e.to))
      prereqs.get(e.to)!.push(e.from);
  });

  // advanced users: treat foundation tier-1 as already done
  const done = new Set<string>();
  if (profile.level === "advanced")
    nodes.forEach((n) => {
      // An at-risk phone breaks the "advanced user already patches" assumption,
      // so keep the updates move in play instead of pre-marking it done.
      if (n.domain === "foundation" && n.tier === 1 && !(phoneAtRisk && n.id === "update-discipline"))
        done.add(n.id);
    });

  const score = new Map(nodes.map((n) => [n.id, scoreNode(n, cidx, actorSet)]));

  // ordering value blends score with a readiness bias: foundations and lower tiers
  // should surface before advanced moves even when a deep move scores highly.
  const tierBias = (n: Node) =>
    (n.domain === "foundation" ? 8 : 0) + (6 - (n.tier || 1)) * 1.6;
  const orderVal = new Map(
    nodes.map((n) => [
      n.id,
      score.get(n.id)! + tierBias(n) + (phoneAtRisk && n.id === "update-discipline" ? PHONE_ATRISK_BOOST : 0),
    ])
  );

  const seq: Node[] = [];
  const placed = new Set<string>(done);
  let guard = 0;
  while (seq.length + placed.size < nodes.length && guard++ < 500) {
    const avail = nodes.filter(
      (n) =>
        !placed.has(n.id) &&
        (prereqs.get(n.id) || []).every(
          (p) => placed.has(p) || !inSet.has(p)
        )
    );
    if (avail.length === 0) break;
    avail.sort((a, b) => orderVal.get(b.id)! - orderVal.get(a.id)!);
    const pick = avail[0];
    placed.add(pick.id);
    seq.push(pick);
  }

  // attach rationale
  return seq.map((n) => ({
    node: n,
    score: score.get(n.id)!,
    urgency: urgencyOf(n.id, cidx),
    counters: cidx.get(n.id) || [],
    assumedDone: false,
  }));
}

/* ------------------------------------------------------------------ */
/*  prereqChain (L166)                                                 */
/* ------------------------------------------------------------------ */

/**
 * Walk prereq edges backward from a target node to collect its full
 * prerequisite chain (any depth).
 *
 * @param targetId — the node to start from
 * @param links    — the model's link array (from buildModel().links)
 * @returns { set: Set<id>, order: id[] }
 *   order is topological: deepest prereqs first, direct prereqs last.
 */
export function prereqChain(
  targetId: string,
  links: ModelLink[]
): PrereqChainResult {
  const pre = new Map<string, string[]>();
  links.forEach((l) => {
    if (l.type === "prereq") {
      const target = typeof l.target === "string" ? l.target : l.target.id;
      const source = typeof l.source === "string" ? l.source : l.source.id;
      if (!pre.has(target)) pre.set(target, []);
      pre.get(target)!.push(source);
    }
  });

  const seen = new Set<string>();
  const order: string[] = [];

  (function walk(id: string) {
    (pre.get(id) || []).forEach((p) => {
      if (!seen.has(p)) {
        seen.add(p);
        walk(p);
        order.push(p);
      }
    });
  })(targetId);

  return { set: seen, order };
}
