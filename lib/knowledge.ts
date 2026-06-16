/**
 * lib/knowledge.ts — pure functions that build the open-knowledge export.
 *
 * SECURITY: these functions contain ZERO user data. No journeyProgress,
 * no profile, no devices, no contributions. Only the open graph/howtos/
 * resources/journeys that are published intentionally.
 *
 * These are pure (no DOM, no storage) so Task 13.2 can call them from
 * Next.js route handlers without any browser-API dependency.
 */

import { GRAPH } from "@/data/graph";
import { HOWTOS } from "@/data/howtos";
import { HOWTO_VARIANTS } from "@/data/howto-variants";
import { RESOURCES } from "@/data/resources";
import { JOURNEYS } from "@/data/journeys";

/* ------------------------------------------------------------------
   Types for the export shape (mirrors the prototype's buildJSON)
   ------------------------------------------------------------------ */

export interface KnowledgeNode {
  id: string;
  label: string;
  domain: string;
  tier: number;
  weight?: number;
  summary: string;
  [key: string]: unknown;
  howto: (typeof HOWTOS)[string] | null;
  deviceVariants: (typeof HOWTO_VARIANTS)[string] | null;
  resources: (typeof RESOURCES)[string];
}

export interface KnowledgeExport {
  project: string;
  version: string;
  generated: string;
  note: string;
  nodes: KnowledgeNode[];
  threats: typeof GRAPH.threats;
  edges: typeof GRAPH.edges;
  journeys: Array<{
    id: string;
    title: string;
    section: string;
    stages: (typeof JOURNEYS)[number]["stages"];
  }>;
}

/* ------------------------------------------------------------------
   buildKnowledgeJSON
   ------------------------------------------------------------------ */

/**
 * Returns a plain object representing the entire open knowledge base.
 *
 * Shape exactly matches the prototype's MachineAccess buildJSON():
 *   { project, version, generated, note,
 *     nodes: [...node merged with howto/deviceVariants/resources],
 *     threats, edges, journeys }
 *
 * CONTAINS ZERO USER DATA.
 */
export function buildKnowledgeJSON(): KnowledgeExport {
  return {
    project: "Privacy Atlas",
    version: GRAPH.version,
    generated: new Date().toISOString(),
    note: "knowledge base intended to be AI-readable; verify claims against each node's sources",
    nodes: GRAPH.nodes.map((n) => ({
      // Full node is intentionally exported (open knowledge). INVARIANT: never store user/private data on graph nodes — it would become public here.
      ...n,
      howto: HOWTOS[n.id] ?? null,
      deviceVariants: HOWTO_VARIANTS[n.id] ?? null,
      resources: RESOURCES[n.id] ?? [],
    })),
    threats: GRAPH.threats,
    edges: GRAPH.edges,
    // Public shape uses "title"; JOURNEYS stores the name as "label" (prototype's j.title was undefined). Keep this mapping.
    journeys: JOURNEYS.map((j) => ({
      id: j.id,
      title: j.label,
      section: j.section,
      stages: j.stages,
    })),
  };
}

/* ------------------------------------------------------------------
   buildLlmsTxt
   ------------------------------------------------------------------ */

/**
 * Returns an llms.txt-style markdown string summarizing the knowledge base.
 *
 * Format exactly matches the prototype's MachineAccess buildMD():
 *   # Privacy Atlas — machine-readable index (llms.txt style)
 *   > summary line
 *   ## Moves
 *   - **label** (domain, tier N): summary...
 *   ## Threats
 *   - **label** (trajectory): countered by ...
 */
export function buildLlmsTxt(): string {
  let md =
    "# Privacy Atlas — machine-readable index (llms.txt style)\n\n" +
    "> A dependency graph of personal-privacy solutions: " +
    GRAPH.nodes.length +
    " moves, " +
    GRAPH.threats.length +
    " threats, " +
    GRAPH.edges.length +
    " edges. Each move carries honest caveats, failure modes, costs, sources, per-device how-tos, and tools.\n\n" +
    "## Moves\n";

  GRAPH.nodes.forEach((n) => {
    md +=
      "- **" +
      n.label +
      "** (" +
      n.domain +
      ", tier " +
      n.tier +
      "): " +
      n.summary.slice(0, 150) +
      (n.summary.length > 150 ? "…" : "") +
      "\n";
  });

  md += "\n## Threats\n";

  GRAPH.threats.forEach((t) => {
    md +=
      "- **" +
      t.label +
      "** (" +
      t.trajectory +
      "): countered by " +
      (t.counters || []).join(", ") +
      "\n";
  });

  return md;
}
