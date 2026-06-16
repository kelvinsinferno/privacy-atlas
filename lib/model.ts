/**
 * lib/model.ts — In-memory model builder for Privacy Atlas.
 *
 * Ported VERBATIM from reference/PrivacyAtlas.jsx (L143–L163), with the
 * entryStatus helpers (L1869–L1878) needed for community-proposal merging.
 * Pure function — no DOM, no React, no storage.
 */

import { GRAPH } from "@/data/graph";
import type { Model, ModelLink } from "@/lib/types";
import { entryStatus } from "@/lib/community";

/* ------------------------------------------------------------------ */
/*  ProposedNode shape (community submission)                          */
/* ------------------------------------------------------------------ */

interface ProposedNode {
  id: string;
  nodeKind: "move" | "threat";
  label: string;
  domain?: string;
  summary?: string;
  honesty?: string;
  rel?: string[];
  src?: { url?: string; title?: string };
  ts?: number;
  confirms?: number;
  flags?: number;
}

interface Contributions {
  proposedNodes?: ProposedNode[];
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  buildModel — ported verbatim from L143–L163                       */
/* ------------------------------------------------------------------ */

/**
 * Build the unified in-memory model from the seed graph plus any verified
 * community proposals. The returned object exposes:
 *   - all     — flat array of all ModelNodes (nodes + threats)
 *   - byId    — Map<id, ModelNode> for O(1) lookup
 *   - links   — edge array with source/target id strings (+ original edge fields)
 *   - adj     — Map<id, Set<neighbor id>> for adjacency queries
 */
export function buildModel(contributions: Contributions | null | undefined): Model {
  const nodes = GRAPH.nodes.map((n) => ({ ...n, kind: "node" as const }));
  const threats = GRAPH.threats.map((t) => ({ ...t, kind: "threat" as const, domain: t.domain, id: t.id }));

  /* verified community proposals join the living graph */
  const props = ((contributions || {}).proposedNodes || []).filter((p) => entryStatus(p) === "verified");
  props.forEach((p) => {
    const src =
      p.src && p.src.url
        ? [{ title: p.src.title || p.src.url, url: p.src.url, kind: "community" }]
        : [];
    if (p.nodeKind === "threat") {
      threats.push({
        id: p.id,
        label: p.label,
        domain: p.domain || "digital",
        trajectory: "emerging",
        tier: 3,
        counters: p.rel || [],
        residual: p.honesty || "",
        sources: src,
        // community flag (beyond base Threat type — matches prototype exactly)
        community: true,
        kind: "threat",
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    } else {
      nodes.push({
        id: p.id,
        label: p.label,
        domain: p.domain || "digital",
        tier: 3,
        weight: 3,
        summary: p.summary || "",
        caveat: p.honesty || "",
        cost: { money: "low", friction: "med", maintenance: "periodic" },
        sources: src,
        actors: [],
        regionScope: "global",
        // community flag (beyond base Node type — matches prototype exactly)
        community: true,
        kind: "node",
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  });

  const commEdges: Array<{ from: string; to: string; type: "counters" }> = [];
  props.forEach((p) =>
    (p.rel || []).forEach((rid) =>
      commEdges.push(
        p.nodeKind === "threat"
          ? { from: rid, to: p.id, type: "counters" }
          : { from: p.id, to: rid, type: "counters" }
      )
    )
  );

  const all = [...nodes, ...threats];
  const byId = new Map(all.map((n) => [n.id, n]));

  const links: ModelLink[] = [...GRAPH.edges, ...commEdges]
    .filter((e) => byId.has(e.from) && byId.has(e.to))
    .map((e, i) => ({
      ...e,
      id: i,
      source: e.from,
      target: e.to,
    }));

  const adj: Map<string, Set<string>> = new Map(all.map((n) => [n.id, new Set<string>()]));
  links.forEach((l) => {
    adj.get(l.source as string)?.add(l.target as string);
    adj.get(l.target as string)?.add(l.source as string);
  });

  return { all, byId, links, adj };
}
