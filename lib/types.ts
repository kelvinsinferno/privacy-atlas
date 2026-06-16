/**
 * lib/types.ts — TypeScript types for the Privacy Atlas graph.
 *
 * Authoritative sources (in priority order):
 *   1. reference/HANDOFF.md §3 DATA MODEL
 *   2. reference/privacy-graph.ts (original schema + v0.2 additions)
 *   3. reference/privacy-graph-v2.json (actual data shape)
 *
 * Load graph data from data/graph.json and cast to Graph.
 */

/* ------------------------------------------------------------------ */
/*  Primitive enumerations                                             */
/* ------------------------------------------------------------------ */

/**
 * Domain ids — open string so new domain ids in data don't break the type.
 * Known values: "foundation" | "digital" | "economic" | "physical" |
 *               "biometric" | "comms" | "civic"
 */
export type Domain = string;

/** Edge relationship types (closed set — HANDOFF §3). */
export type EdgeType =
  | "prereq"    // hard unlock: `to` does not work until `from` is done
  | "enables"   // synergy (often cross-domain)
  | "sequence"  // timing hazard — do A before B
  | "tension"   // tradeoff — reconcile, don't "complete" both
  | "counters"  // defense node → threat id
  | "reveals";  // addressing A exposes threat/limitation B

/** Adversary / threat actor id. Open string to avoid constraining seed data. */
export type Actor = string;

/** Urgency trajectory for a threat (HANDOFF §3 — closed set). */
export type Trajectory =
  | "steady"
  | "growing"
  | "exploding"
  | "emerging"
  | "variable";

/** Whether a node is a clean win, awareness-only, or actively a trap. */
export type Actionability = "action" | "awareness" | "trap";

/* ------------------------------------------------------------------ */
/*  Cost / friction / maintenance                                      */
/* ------------------------------------------------------------------ */

/**
 * Cost structure for a node (HANDOFF §3).
 * Drives realistic-ranking and re-check scheduling.
 */
export interface Cost {
  /** Out-of-pocket financial cost. */
  money: "none" | "low" | "med" | "high";
  /** Daily inconvenience / social weirdness / difficulty. */
  friction: "none" | "low" | "med" | "high";
  /** Upkeep burden over time. */
  maintenance: "none" | "once" | "periodic" | "ongoing";
}

/* ------------------------------------------------------------------ */
/*  Sources                                                            */
/* ------------------------------------------------------------------ */

/**
 * Click-through reference source (HANDOFF §3 — "sources REQUIRED, verifiability is a feature").
 * kind is open string (known: "primary" | "docs" | "research" | "news" | "org" | "reference").
 */
export interface Source {
  title: string;
  url: string;   // https?://
  kind: string;  // open — see SourceKind in privacy-graph.ts for known values
}

/* ------------------------------------------------------------------ */
/*  Cadence                                                            */
/* ------------------------------------------------------------------ */

/**
 * Re-check / maintenance cadence for a node.
 * Derived from JSON data shape (privacy-graph-v2.json).
 */
export type Cadence =
  | { type: "once" }
  | { type: "ongoing"; reason?: string }
  | { type: "periodic"; everyDays?: number; reason?: string }
  | { type: "recurring"; everyDays: number; reason: string }
  | { type: "managed"; reason: string }; // ongoing state, no fixed interval

/* ------------------------------------------------------------------ */
/*  Graph catalog entries                                              */
/* ------------------------------------------------------------------ */

/** One country's overlay for a move/threat. Only `status` is required so partial
 *  entries are valid. Content is community/AI/curator-supplied — never fabricated here. */
export interface RegionOverlay {
  status: "applies" | "different" | "not-applicable";
  note?: string;
  steps?: string[];
  law?: { name: string; ref?: string };
  sources?: { title: string; url: string }[];
}

/**
 * A privacy "move" — the core catalog entry (HANDOFF §3 Node).
 *
 * Required fields: id, label, domain, tier, weight, summary, cost, actors, sources, regionScope.
 * All others optional so partial / community nodes still type-check.
 */
export interface Node {
  id: string;
  label: string;
  /** Domain id — open string (see Domain type). */
  domain: Domain;
  /** Threat tier (1–5) at which this move starts to matter. */
  tier: 1 | 2 | 3 | 4 | 5;
  /** Leverage score 1–5 used to rank recommendations. */
  weight: 1 | 2 | 3 | 4 | 5;
  /** Plain-language description of the move. */
  summary: string;
  /** Intrinsic tradeoff/limit of the move itself (not an edge). */
  caveat?: string;
  /** What happens when this defense breaks or lapses (honesty field). */
  failureMode?: string;
  /** Cost / friction / maintenance burden. */
  cost: Cost;
  /** Actor ids this move chiefly defends against. */
  actors: Actor[];
  /** sources REQUIRED — verifiability is a feature (HANDOFF §3). */
  sources: Source[];
  /** Whether node specifics are universal or jurisdiction-dependent. */
  regionScope: string; // "global" | "localized" — open string
  /** Per-country overlays, keyed by ISO 3166-1 alpha-2. Empty/absent until populated. */
  regions?: Record<string, RegionOverlay>;
  /** Whether the move is a clean win, awareness-only, or a trap. */
  actionability?: Actionability;
  /**
   * Finance-privacy privacy ceiling.
   * e.g. "sovereign" | "sovereign-immovable" | "intermediary"
   */
  ceiling?: string;
  /** Comms infra-independence axis (0 = needs ISP/carrier; 5 = you own it). */
  infraIndependence?: number;
  /** Comms anonymity axis (0 = identity-bound; 5 = sneakernet). */
  anonymity?: number;
  /** Whether this node's content is backed by directed research + sources. */
  researched?: boolean;
  /** Whether this node involves legal/jurisdictional sensitivity. */
  legalSensitive?: boolean;
  /** Re-check / maintenance cadence. */
  cadence?: Cadence;
  /** Free-form classification tags (e.g. "sms-avoid"). */
  tags?: string[];
}

/**
 * A threat entry in the graph (HANDOFF §3 Threat).
 * ids conventionally start with "T-".
 */
export interface Threat {
  id: string;
  label: string;
  /** Domain id (open string; may be "cross-cutting"). */
  domain: string;
  /** Urgency trajectory — independent of tier. */
  trajectory: Trajectory;
  /** Tier at which this threat becomes relevant. */
  tier: 1 | 2 | 3 | 4 | 5;
  /** Node ids that defend against this threat (full or partial). */
  counters: string[];
  /** What no current defense fully solves — honesty field. */
  residual: string;
  /** Click-through sources (same shape as Node sources). */
  sources?: Source[];
  /** Whether the content is grounded in a specific book/publication. */
  book_grounded?: boolean;
}

/**
 * A directed relationship between two graph entries (HANDOFF §3 Edge types).
 */
export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
  /** Human-readable guidance surfaced when the edge is relevant. */
  guidance?: string;
  /** Severity for sequence/tension edges. */
  severity?: "info" | "warn" | "block";
  /** True when the edge crosses domain boundaries. */
  crossDomain?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Graph catalog metadata entries                                     */
/* ------------------------------------------------------------------ */

/** A domain catalog entry (from graph.domains[]). */
export interface DomainEntry {
  id: string;
  label: string;
  note?: string;
}

/** An edge-type catalog entry (from graph.edgeTypes[]). */
export interface EdgeTypeEntry {
  id: EdgeType;
  label: string;
}

/** An actor catalog entry (from graph.actors[]). */
export interface ActorEntry {
  id: string;
  label: string;
  tierFloor: 1 | 2 | 3 | 4 | 5;
}

/** A tier metadata entry (from graph.tiers[]). */
export interface TierMeta {
  tier: 1 | 2 | 3 | 4 | 5;
  label: string;
  adversary: string;
}

/** An axis metadata entry (from graph.axes[]). */
export interface AxisMeta {
  id: string;
  label: string;
  range: [number, number];
  note?: string;
}

/* ------------------------------------------------------------------ */
/*  Region overlays                                                    */
/* ------------------------------------------------------------------ */

/**
 * A region-specific overlay entry (from graph.overlays[]).
 * Describes how a node's effort/availability differs in a given region.
 */
export interface OverlayEntry {
  nodeId: string;
  region: string;              // e.g. "US", "US-CA"
  status: string;              // "available" | "easier" | "harder" — open string
  effort: string;              // "low" | "medium" | "high" — open string
  mechanism: string;
  notes?: string;
  lastVerified: string;        // ISO date string
}

/* ------------------------------------------------------------------ */
/*  Top-level graph container                                          */
/* ------------------------------------------------------------------ */

/**
 * The complete graph document (privacy-graph-v2.json shape).
 * Cast `data/graph.json` to this type in Task 1.2.
 */
export interface Graph {
  version: string;
  defaultRegion?: string;
  generated?: string;
  tiers?: TierMeta[];
  /** Axis metadata (infra_independence, anonymity, etc.). */
  axes?: AxisMeta[];
  domains: DomainEntry[];
  edgeTypes: EdgeTypeEntry[];
  actors: ActorEntry[];
  nodes: Node[];
  threats: Threat[];
  edges: Edge[];
  /** Documentation string for sources[] convention (from JSON root). */
  sourceNote?: string;
  /** Region-specific overlays that modify how a node applies locally. */
  overlays?: OverlayEntry[];
}

/* ------------------------------------------------------------------ */
/*  In-memory model (Task 2.2 finalizes links; kept loose for now)    */
/* ------------------------------------------------------------------ */

/**
 * A node or threat tagged with its kind, for uniform graph traversal.
 */
export type ModelNode = (Node | Threat) & { kind: "node" | "threat" };

/**
 * A single directed link in the in-memory model — produced by buildModel().
 *
 * source/target are id strings when the model is first built; D3's force
 * simulation mutates them in-place to full node objects during layout, hence
 * the union type (mirrors D3's SimulationLinkDatum contract).
 */
export interface ModelLink {
  /** Sequential index assigned by buildModel (stable within one model build). */
  id: number;
  /** Originating node/threat id — may become a full ModelNode after D3 hydration. */
  source: string | ModelNode;
  /** Destination node/threat id — may become a full ModelNode after D3 hydration. */
  target: string | ModelNode;
  /** Relationship kind (from the underlying Edge). */
  type: EdgeType;
  /** Human-readable guidance surfaced when the edge is relevant. */
  guidance?: string;
  /** Severity for sequence/tension edges. */
  severity?: "info" | "warn" | "block";
  /** Raw from/to ids carried along from the seed edge (always strings). */
  from: string;
  to: string;
}

/**
 * Runtime in-memory model built from Graph by buildModel().
 */
export interface Model {
  all: ModelNode[];
  byId: Map<string, ModelNode>;
  links: ModelLink[];
  adj: Map<string, Set<string>>;
}
