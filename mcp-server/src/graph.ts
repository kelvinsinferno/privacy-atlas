// Loads the Privacy Atlas graph and provides the shared query/format logic used by every tool.
// This mirrors the in-app engine (path building, threat coverage) so the MCP surface and the
// website stay consistent — one knowledge base, multiple access methods.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Graph, MoveNode, ThreatNode, Edge, Friction } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// data/ sits beside dist/ at the project root after build
const GRAPH_PATH = process.env.PRIVACY_ATLAS_GRAPH || join(__dirname, "..", "data", "privacy-graph.json");

export const GRAPH: Graph = JSON.parse(readFileSync(GRAPH_PATH, "utf-8"));

export const CHARACTER_LIMIT = 25000;

const FRICTION_RANK: Record<Friction, number> = { none: 0, low: 1, med: 2, high: 3 };

// ---- app-mirrored scoring constants (from data/ui-maps.ts) ------------------

/** Trajectory urgency weights — mirrors TRAJ_W in data/ui-maps.ts. */
const TRAJ_W: Record<string, number> = { exploding: 3, growing: 2, emerging: 2, steady: 1, variable: 1, shrinking: 0 };

/** Money cost penalty — mirrors MONEY_PEN in data/ui-maps.ts. */
const MONEY_PEN: Record<string, number> = { none: 0, low: 1, med: 2, high: 3 };

/** Friction cost penalty used in scoreNode — mirrors FRIC_PEN in data/ui-maps.ts. */
const FRIC_PEN: Record<string, number> = { low: 0, med: 1, high: 2 };

/** worry → actor ids — mirrors WORRY in data/ui-maps.ts. */
const WORRY_ACTORS: Record<string, string[]> = {
  brokers: ["advertiser", "broker", "platform"],
  person:  ["stalker", "acquaintance"],
  crime:   ["criminal"],
  state:   ["local-le", "federal", "state-actor"],
  broad:   ["advertiser", "broker", "platform", "stalker", "acquaintance", "criminal", "local-le", "federal", "state-actor"],
};

// ---- indexes ----------------------------------------------------------------

const moveById = new Map<string, MoveNode>(GRAPH.nodes.map((n) => [n.id, n]));
const threatById = new Map<string, ThreatNode>(GRAPH.threats.map((t) => [t.id, t]));
const allById = new Map<string, MoveNode | ThreatNode>([...moveById, ...threatById]);

export function domainList(): string[] {
  return GRAPH.domains.map((d) => (typeof d === "string" ? d : d.id));
}

// ---- lookup -----------------------------------------------------------------

/** Resolve a move by id OR by case-insensitive exact/loose label match. */
export function resolveMove(idOrLabel: string): MoveNode | undefined {
  if (moveById.has(idOrLabel)) return moveById.get(idOrLabel);
  const q = idOrLabel.trim().toLowerCase();
  let loose: MoveNode | undefined;
  for (const n of GRAPH.nodes) {
    const l = n.label.toLowerCase();
    if (l === q) return n;
    if (!loose && (l.includes(q) || q.includes(l))) loose = n;
  }
  return loose;
}

export function resolveThreat(idOrLabel: string): ThreatNode | undefined {
  if (threatById.has(idOrLabel)) return threatById.get(idOrLabel);
  const q = idOrLabel.trim().toLowerCase();
  let loose: ThreatNode | undefined;
  for (const t of GRAPH.threats) {
    const l = t.label.toLowerCase();
    if (l === q) return t;
    if (!loose && (l.includes(q) || q.includes(l))) loose = t;
  }
  return loose;
}

export function searchMoves(query: string, domain?: string): MoveNode[] {
  const q = query.trim().toLowerCase();
  return GRAPH.nodes.filter((n) => {
    if (domain && n.domain !== domain) return false;
    const hay = `${n.label} ${n.summary || ""} ${n.id}`.toLowerCase();
    return hay.includes(q);
  });
}

/** Moves that counter a given threat, in the threat's listed order. */
export function countersForThreat(t: ThreatNode): MoveNode[] {
  const ids = new Set<string>(t.counters || []);
  // also include any "counters" edges pointing at this threat
  for (const e of GRAPH.edges) if (e.type === "counters" && e.to === t.id) ids.add(e.from);
  return [...ids].map((id) => moveById.get(id)).filter((m): m is MoveNode => !!m);
}

/** Prerequisite move ids for a move (incoming prereq edges). */
function prereqsOf(id: string): string[] {
  return GRAPH.edges.filter((e) => e.type === "prereq" && e.to === id).map((e) => e.from);
}

// ---- buildPath scoring helpers (mirror lib/path.ts) ------------------------

/** Build index: nodeId → threat objects it counters (mirrors countersIndex in lib/path.ts). */
function countersIndex(): Map<string, ThreatNode[]> {
  const tById = new Map(GRAPH.threats.map((t) => [t.id, t]));
  const idx = new Map<string, ThreatNode[]>();
  GRAPH.edges.forEach((e) => {
    if (e.type === "counters" && tById.has(e.to)) {
      if (!idx.has(e.from)) idx.set(e.from, []);
      idx.get(e.from)!.push(tById.get(e.to)!);
    }
  });
  return idx;
}

/** Urgency = sum of trajectory weight of countered threats (mirrors urgencyOf in lib/path.ts). */
function urgencyOf(nodeId: string, cidx: Map<string, ThreatNode[]>): number {
  return (cidx.get(nodeId) || []).reduce(
    (s, t) => s + (TRAJ_W[t.trajectory ?? ""] ?? 1),
    0
  );
}

/** Realistic, personalized score: leverage + urgency + actor-relevance − cost (mirrors scoreNode in lib/path.ts). */
function scoreNode(
  n: MoveNode,
  cidx: Map<string, ThreatNode[]>,
  actorSet: Set<string> | null
): number {
  const urgency = urgencyOf(n.id, cidx);
  const actorBoost =
    actorSet && (n.actors || []).some((a) => actorSet.has(a)) ? 4 : 0;
  const cost = n.cost
    ? (MONEY_PEN[n.cost.money ?? ""] || 0) + (FRIC_PEN[n.cost.friction ?? ""] || 0)
    : 0;
  return (n.weight || 1) * 2 + urgency * 1.3 + actorBoost - cost;
}

/**
 * MIRRORS lib/path.ts in the main app — keep in sync; if you change scoring/ordering there, change it here.
 *
 * Build an ordered, prerequisite-respecting recommended path for a profile.
 *
 * The `level` parameter (1–5) maps to the app's skill level:
 *   5 → "advanced" (foundation tier-1 nodes are assumed done and skipped)
 *   1–4 → no pre-skipping (beginner/intermediate)
 *
 * Scoring (mirrors lib/path.ts scoreNode + tierBias + orderVal):
 *   score = weight*2 + urgency*1.3 + actorBoost(4 if actor match) − (moneyPen + fricPen)
 *   orderVal = score + tierBias  where tierBias = (foundation?8:0) + (6−tier)*1.6
 *
 * Filters (mirrors lib/path.ts):
 *   - Skip nodes with actionability === "trap"
 *   - Skip nodes where cost.friction rank > friction cap (none=0,low=1,med=2,high=3)
 *   - No domain filter (domains=null, matching the app's onboarding default)
 *   - No tier cap (the app does not cap tiers; tier only affects orderVal bias)
 */
export function buildPath(
  worry: string,
  friction: Friction,
  level: number
): MoveNode[] {
  const cidx = countersIndex();
  const actors = WORRY_ACTORS[worry] || WORRY_ACTORS.broad;
  const actorSet = new Set<string>(actors);
  const fricCap = FRICTION_RANK[friction];

  // Filter candidates — mirrors lib/path.ts lines 114–124
  const nodes = GRAPH.nodes.filter((n) => {
    if (n.actionability === "trap") return false;           // never recommend a trap
    if (n.cost && FRICTION_RANK[n.cost.friction as Friction] > fricCap) return false;
    // domains=null (no domain filter) — matches app onboarding default
    return true;
  });

  const inSet = new Set(nodes.map((n) => n.id));

  // Prereqs among candidate set — mirrors lib/path.ts lines 131–135
  const prereqs = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  GRAPH.edges.forEach((e) => {
    if (e.type === "prereq" && inSet.has(e.from) && inSet.has(e.to))
      prereqs.get(e.to)!.push(e.from);
  });

  // Advanced users: treat foundation tier-1 as already done — mirrors lib/path.ts lines 138–142
  // level 5 maps to the app's "advanced" skill level
  const done = new Set<string>();
  if (level >= 5)
    nodes.forEach((n) => {
      if (n.domain === "foundation" && n.tier === 1) done.add(n.id);
    });

  // Score each node — mirrors lib/path.ts scoreNode formula
  const score = new Map(nodes.map((n) => [n.id, scoreNode(n, cidx, actorSet)]));

  // orderVal = score + tierBias — mirrors lib/path.ts lines 148–152
  const tierBias = (n: MoveNode): number =>
    (n.domain === "foundation" ? 8 : 0) + (6 - (n.tier || 1)) * 1.6;
  const orderVal = new Map(
    nodes.map((n) => [n.id, score.get(n.id)! + tierBias(n)])
  );

  // Greedy topological pick loop — mirrors lib/path.ts lines 154–170
  const seq: MoveNode[] = [];
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

  return seq;
}

/**
 * MIRRORS the app's coverage logic (journeyStats/GraphCanvas) — keep in sync.
 *
 * Given completed move ids, report per-threat counter coverage.
 * fraction = countered / total; beaten ≥ 1.0, weakened ≥ 0.5, else exposed.
 * Mirrors the living-web logic: fraction of a threat's counters the user has done.
 */
export interface ThreatCoverage {
  id: string;
  label: string;
  countered: number;
  total: number;
  fraction: number;
  status: "beaten" | "weakened" | "exposed";
  residual?: string;
}

export function coverage(doneIds: string[]): ThreatCoverage[] {
  const done = new Set(doneIds);
  return GRAPH.threats.map((t) => {
    const cs = countersForThreat(t);
    const total = cs.length;
    const countered = cs.filter((m) => done.has(m.id)).length;
    const fraction = total ? countered / total : 0;
    const status: ThreatCoverage["status"] =
      fraction >= 1 ? "beaten" : fraction >= 0.5 ? "weakened" : "exposed";
    return { id: t.id, label: t.label, countered, total, fraction, status, residual: t.residual };
  });
}

// ---- relationships ----------------------------------------------------------

export interface Relations {
  prereqs: string[];
  enables: string[];
  sequenceAfter: string[];
  tensions: string[];
  counters: string[]; // threats this move counters
  reveals: string[];
}

export function relationsOf(id: string): Relations {
  const r: Relations = { prereqs: [], enables: [], sequenceAfter: [], tensions: [], counters: [], reveals: [] };
  for (const e of GRAPH.edges) {
    const otherLabel = (oid: string) => allById.get(oid)?.label || oid;
    if (e.to === id && e.type === "prereq") r.prereqs.push(otherLabel(e.from));
    if (e.from === id && e.type === "enables") r.enables.push(otherLabel(e.to));
    if (e.to === id && e.type === "sequence") r.sequenceAfter.push(otherLabel(e.from));
    if ((e.from === id || e.to === id) && e.type === "tension") r.tensions.push(otherLabel(e.from === id ? e.to : e.from));
    if (e.from === id && e.type === "counters") r.counters.push(otherLabel(e.to));
    if (e.from === id && e.type === "reveals") r.reveals.push(otherLabel(e.to));
  }
  return r;
}

// ---- formatting -------------------------------------------------------------

export function moveSummaryLine(m: MoveNode): string {
  const c = m.cost || {};
  return `- **${m.label}** \`${m.id}\` — ${m.domain}, tier ${m.tier ?? "?"} · cost: ${c.money ?? "?"}/${c.friction ?? "?"} effort · ${m.summary ? m.summary.slice(0, 140) : ""}`;
}

export function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return text.slice(0, CHARACTER_LIMIT) + `\n\n…(truncated at ${CHARACTER_LIMIT} chars — narrow your query or request a specific id)`;
}

/** llms.txt-style overview of the whole atlas. */
export function overviewMarkdown(): string {
  const lines: string[] = [];
  lines.push(`# Privacy Atlas — knowledge graph (v${GRAPH.version})`);
  lines.push("");
  lines.push("Privacy Atlas maps personal privacy as a graph of SOLUTIONS ('moves') and the THREATS they counter, across domains: " + domainList().join(", ") + ".");
  lines.push("Every move carries an honest caveat / failure mode and verifiable sources. Threats are 'countered' or 'weakened', never 'neutralized'.");
  lines.push("");
  lines.push(`Counts: ${GRAPH.nodes.length} moves, ${GRAPH.threats.length} threats, ${GRAPH.edges.length} relationships.`);
  lines.push("");
  lines.push("## Tools available");
  lines.push("- `atlas_search_moves` — find moves by keyword/domain");
  lines.push("- `atlas_get_move` — full detail of one move (how it helps, caveats, cost, what it counters, sources)");
  lines.push("- `atlas_list_threats` — threats and what defeats each");
  lines.push("- `atlas_counters_for_threat` — the moves that defeat a specific threat");
  lines.push("- `atlas_build_path` — an ordered, profile-specific plan");
  lines.push("- `atlas_coverage` — given completed moves, which threats are beaten/weakened/exposed");
  lines.push("");
  lines.push("## Moves by domain");
  for (const d of domainList()) {
    const ms = GRAPH.nodes.filter((n) => n.domain === d);
    if (!ms.length) continue;
    lines.push(`\n### ${d} (${ms.length})`);
    for (const m of ms) lines.push(`- ${m.label} \`${m.id}\``);
  }
  return lines.join("\n");
}
